/*
  IoT Water Monitoring System — ESP32 DevKit V1 firmware
  --------------------------------------------------------
  Required libraries (install via Arduino Library Manager):
    - ArduinoJson (Benoit Blanchon)          v6.x or v7.x
    - WebSockets  (Markus Sattler / Links2004) v2.4+  (provides Socket.IO client)
  Board: "ESP32 Dev Module" (esp32 core by Espressif, installed via Boards Manager)

  This version talks to a server hosted on Render (HTTPS-only, port 443),
  so all HTTP calls and the Socket.IO connection go over TLS via
  WiFiClientSecure. Certificate validation is skipped (setInsecure()) for
  simplicity — fine for a hobby/personal project, not for anything handling
  sensitive data.

  Behaviour:
    - On boot: connect WiFi, load this unit's plants + assigned pins from the
      server over HTTPS (GET /api/esp/plants/:uid), then connect Socket.IO.
    - Every MOISTURE_READ_INTERVAL_MS: read each active sensor, convert to %,
      push the reading to the server (Socket.IO first, HTTP as a fallback),
      and open/close the matching relay based on preferred_moisture.
    - Every PLANT_CONFIG_REFRESH_MS: re-fetch plant/pin config via HTTP, in
      case the user added/removed/edited a plant in the app.
    - Fixed hardware wiring (5 sensor+pump slots) is defined below and must
      match the pin_connection collection seeded on the server
      (server/scripts/seedPinConnections.js).

  NOTE on Render free tier: if your service is on Render's free plan, it
  spins down after ~15 min of no traffic. The first request after that can
  take 20-50s to respond while the instance wakes up — this firmware uses
  generous HTTP timeouts and will just retry on the next cycle, but expect
  a slow/failed first fetchPlantConfig() after idle periods.

  ---------------------------------------------------------------------
  LOGGING NOTE (modified):
  Every state transition and action (WiFi connect/reconnect, config load,
  each plant slot loaded/deactivated, sensor readings, relay/pump
  start-stop, Socket.IO transport/namespace state, HTTP fallback calls,
  heartbeat) is now printed to Serial UNCONDITIONALLY — it no longer
  depends on the VERBOSE_LOGS flag below. VERBOSE_LOGS is kept around
  only in case you want to silence things again later; as shipped it's
  ignored and everything prints.
  ---------------------------------------------------------------------

  NOTE: this is a single-file build. The contents that would normally live
  in a separate config.h have been merged directly below (in place of the
  old #include "config.h") so the whole sketch is self-contained in this
  one .ino file.
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>

// =========================================================================
// ---- Config (formerly config.h) ----
// =========================================================================

// ---- WiFi ----
#define WIFI_SSID "arobro"
#define WIFI_PASSWORD "12345678"

// ---- Server ----
// Bare hostname only — no "https://", no trailing slash, no port.
// The firmware builds the full URL itself (protocol + host + port).
#define SERVER_HOST "iot-based-automated-watering-sytem-server.onrender.com"
#define SERVER_PORT 443          // Render serves HTTPS on the standard port 443
#define SERVER_USE_SSL true      // Render is HTTPS-only

// ---- Owner ----
// The Firebase UID this ESP32 unit belongs to (one physical unit = one user's plants).
#define OWNER_UID "95HqMkAJAdYY0vky7hw82tGkQ5h2"

// ---- Timing ----
#define PLANT_CONFIG_REFRESH_MS 60000UL   // reload plant/pin assignments from server every 60s
#define MOISTURE_READ_INTERVAL_MS 5000UL  // read sensors every 5s
#define SOCKET_RECONNECT_MS 5000UL

// Capacitive moisture sensor calibration (raw ADC reading -> %).
// Adjust these after testing your specific sensors in dry air / a cup of water.
#define MOISTURE_ADC_DRY 3000  // raw value in dry air (~0% moisture)
#define MOISTURE_ADC_WET 2500  // raw value fully submerged in water (~100% moisture)

// ---- Logging ----
// Set to 0 to silence verbose action logs and keep only warnings/errors.
#define VERBOSE_LOGS 1

// =========================================================================
// ---- End config ----
// =========================================================================

#define NUM_SLOTS 5

// LOGF now always prints, regardless of VERBOSE_LOGS above, so every
// state/action below shows up on Serial.
#define LOGF(...) Serial.printf(__VA_ARGS__)

// Fixed physical wiring — sensor_index 1..5 maps to array index 0..4.
// Must match server/scripts/seedPinConnections.js
const int MOISTURE_PINS[NUM_SLOTS] = {34, 35, 32, 33, 36};
const int RELAY_PINS[NUM_SLOTS] = {25, 23, 21, 26, 27};

// Most relay modules are active-LOW (LOW = relay energized / pump ON).
// Flip this if your relay board is active-HIGH.
const bool RELAY_ACTIVE_LOW = true;

struct PlantSlot {
  bool active = false;
  String plant_id;
  String plant_name;
  float preferred_moisture = 0;
  bool is_watering = false;
  float current_moisture = -1;
};

PlantSlot slots[NUM_SLOTS];

WiFiClientSecure secureClient; // used for both HTTPS (HTTPClient) and WSS (WebSocketsClient)
WebSocketsClient webSocket;
bool socketConnected = false;
bool namespaceConnected = false;

unsigned long lastConfigFetch = 0;
unsigned long lastMoistureRead = 0;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_MS = 30000UL;

// ---------------- WiFi ----------------

void connectWiFi() {
  Serial.printf("[wifi] STATE: connecting -> SSID='%s'\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
    if (millis() - start > 30000UL) {
      Serial.println();
      Serial.println("[wifi] STATE: still not connected after 30s -> retrying WiFi.begin()");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      start = millis();
    }
  }
  Serial.println();
  Serial.printf("[wifi] STATE: connected. IP=%s  RSSI=%d dBm\n",
                 WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

// ---------------- HTTP helpers ----------------

String buildUrl(const String& path) {
  String protocol = SERVER_USE_SSL ? "https" : "http";
  return protocol + "://" + String(SERVER_HOST) + ":" + String(SERVER_PORT) + path;
}

bool httpBegin(HTTPClient& http, const String& url) {
  bool ok;
  if (SERVER_USE_SSL) {
    ok = http.begin(secureClient, url);
  } else {
    ok = http.begin(url);
  }
  http.setConnectTimeout(15000); // Render free tier can be slow to wake from sleep
  http.setTimeout(15000);
  return ok;
}

void relayWrite(int pin, bool energize) {
  bool level = RELAY_ACTIVE_LOW ? !energize : energize;
  digitalWrite(pin, level ? HIGH : LOW);
  Serial.printf("[relay] ACTION: pin=%d -> %s\n", pin, energize ? "ON (pump energized)" : "OFF");
}

// ---------------- HTTP: load plant/pin config ----------------

void fetchPlantConfig() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[config] STATE: skipped, WiFi not connected.");
    return;
  }

  String url = buildUrl("/api/esp/plants/" + String(OWNER_UID));
  Serial.printf("[config] ACTION: GET %s\n", url.c_str());

  HTTPClient http;
  httpBegin(http, url);
  int code = http.GET();
  Serial.printf("[config] STATE: response code=%d\n", code);

  if (code != 200) {
    Serial.printf("[config] STATE: fetch failed (code=%d). Keeping previous configuration.\n", code);
    http.end();
    return;
  }

  String body = http.getString();
  http.end();
  Serial.printf("[config] DATA LOAD: received %d bytes of JSON body\n", body.length());

  JsonDocument doc; // ArduinoJson v7 style; use DynamicJsonDocument<1024> doc; for v6
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    Serial.printf("[config] STATE: JSON parse error: %s\n", err.c_str());
    return;
  }

  for (int i = 0; i < NUM_SLOTS; i++) {
    slots[i].active = false;
  }

  JsonArray plants = doc["plants"].as<JsonArray>();
  Serial.printf("[config] DATA LOAD: %d plant entries found in response\n", plants.size());
  int loaded = 0;
  for (JsonObject p : plants) {
    int sensorIndex = p["sensor_index"] | 0; // 1..5
    if (sensorIndex < 1 || sensorIndex > NUM_SLOTS) {
      Serial.printf("[config] STATE: skipping plant with invalid sensor_index=%d\n", sensorIndex);
      continue;
    }

    int i = sensorIndex - 1;
    slots[i].active = true;
    slots[i].plant_id = p["plant_id"].as<String>();
    slots[i].plant_name = p["plant_name"].as<String>();
    slots[i].preferred_moisture = p["preferred_moisture"] | 0.0;
    loaded++;

    Serial.printf("[config] STATE: slot %d ACTIVE -> plant='%s' id=%s target=%.1f%%\n",
         sensorIndex, slots[i].plant_name.c_str(), slots[i].plant_id.c_str(),
         slots[i].preferred_moisture);
  }

  for (int i = 0; i < NUM_SLOTS; i++) {
    if (!slots[i].active) {
      relayWrite(RELAY_PINS[i], false);
      Serial.printf("[config] STATE: slot %d INACTIVE -> relay off\n", i + 1);
    }
  }

  Serial.printf("[config] STATE: refresh complete: %d/%d slots active.\n", loaded, NUM_SLOTS);
}

// ---------------- HTTP: fallback state updates ----------------

void httpUpdateMoisture(const String& plantId, float moisture) {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = buildUrl("/api/esp/plants/" + plantId + "/moisture");
  HTTPClient http;
  httpBegin(http, url);
  http.addHeader("Content-Type", "application/json");
  String payload = "{\"current_moisture\":" + String(moisture, 1) + "}";
  int code = http.PUT(payload);
  Serial.printf("[http] ACTION: PUT moisture plant=%s value=%.1f -> code=%d\n",
                plantId.c_str(), moisture, code);
  http.end();
}

void httpUpdateWatering(const String& plantId, bool starting) {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = buildUrl("/api/esp/plants/" + plantId + "/watering");
  HTTPClient http;
  httpBegin(http, url);
  http.addHeader("Content-Type", "application/json");
  String payload = starting ? "{\"status\":\"start\"}" : "{\"status\":\"stop\"}";
  int code = http.PUT(payload);
  Serial.printf("[http] ACTION: PUT watering plant=%s status=%s -> code=%d\n",
       plantId.c_str(), starting ? "start" : "stop", code);
  http.end();
}

// ---------------- Socket.IO ----------------
// This library talks raw Engine.IO/Socket.IO v4 frames over the WebSocket.
// Frame types we care about:
//   "0..."  -> Engine.IO "open"
//   "40"    -> Socket.IO namespace connected
//   "42[...]" -> Socket.IO event message

void socketIOEmit(const String& event, const String& jsonPayload) {
  if (!namespaceConnected) {
    Serial.printf("[socket] STATE: emit skipped (namespace not connected yet): %s\n", event.c_str());
    return;
  }
  String frame = "42[\"" + event + "\"," + jsonPayload + "]";
  webSocket.sendTXT(frame);
  Serial.printf("[socket] ACTION: emit '%s' -> %s\n", event.c_str(), jsonPayload.c_str());
}

void socketIOEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("[socket] STATE: DISCONNECTED");
      socketConnected = false;
      namespaceConnected = false;
      break;

    case WStype_CONNECTED:
      Serial.println("[socket] STATE: transport CONNECTED");
      socketConnected = true;
      break;

    case WStype_TEXT: {
      String msg = String((char*)payload).substring(0, length);
      if (msg.length() == 0) break;
      Serial.printf("[socket] STATE: RX: %s\n", msg.c_str());

      if (msg[0] == '0') {
        Serial.println("[socket] STATE: Engine.IO open received -> requesting namespace connect");
        webSocket.sendTXT("40");
      } else if (msg.startsWith("40")) {
        Serial.println("[socket] STATE: namespace CONNECTED");
        namespaceConnected = true;
        socketIOEmit("join", "\"" + String(OWNER_UID) + "\"");
      }
      break;
    }

    case WStype_ERROR:
      Serial.println("[socket] STATE: ERROR event received");
      break;

    default:
      break;
  }
}

void setupSocketIO() {
  String path = "/socket.io/?EIO=4&transport=websocket";
  Serial.printf("[socket] ACTION: connecting to %s:%d%s (ssl=%s)\n", SERVER_HOST, SERVER_PORT, path.c_str(),
       SERVER_USE_SSL ? "true" : "false");

  if (SERVER_USE_SSL) {
    webSocket.beginSSL(SERVER_HOST, SERVER_PORT, path);
  } else {
    webSocket.begin(SERVER_HOST, SERVER_PORT, path);
  }
  webSocket.onEvent(socketIOEvent);
  webSocket.setReconnectInterval(SOCKET_RECONNECT_MS);
}

// ---------------- Sensors ----------------

float readMoisturePercent(int pin) {
  int raw = analogRead(pin);
  long pct = map(raw, MOISTURE_ADC_DRY, MOISTURE_ADC_WET, 0, 100);
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return (float)pct;
}

void handleSlot(int i) {
  if (!slots[i].active) return;

  float moisture = readMoisturePercent(MOISTURE_PINS[i]);
  slots[i].current_moisture = moisture;

  Serial.printf("[sensor] STATE: slot %d '%s' moisture=%.1f%% target=%.1f%%\n",
       i + 1, slots[i].plant_name.c_str(), moisture, slots[i].preferred_moisture);

  String payload = "{\"plant_id\":\"" + slots[i].plant_id + "\",\"current_moisture\":" +
                    String(moisture, 1) + "}";
  socketIOEmit("esp:moistureReading", payload);
  httpUpdateMoisture(slots[i].plant_id, moisture);

  bool shouldWater = moisture < slots[i].preferred_moisture;

  if (shouldWater && !slots[i].is_watering) {
    slots[i].is_watering = true;
    relayWrite(RELAY_PINS[i], true);
    Serial.printf("[watering] STATE: START slot=%d plant='%s' moisture=%.1f target=%.1f relay_pin=%d\n",
         i + 1, slots[i].plant_name.c_str(), moisture, slots[i].preferred_moisture, RELAY_PINS[i]);

    String evt = "{\"plant_id\":\"" + slots[i].plant_id + "\",\"status\":\"start\"}";
    socketIOEmit("esp:wateringEvent", evt);
    httpUpdateWatering(slots[i].plant_id, true);
  } else if (!shouldWater && slots[i].is_watering) {
    slots[i].is_watering = false;
    relayWrite(RELAY_PINS[i], false);
    Serial.printf("[watering] STATE: STOP slot=%d plant='%s' moisture=%.1f target=%.1f relay_pin=%d\n",
         i + 1, slots[i].plant_name.c_str(), moisture, slots[i].preferred_moisture, RELAY_PINS[i]);

    String evt = "{\"plant_id\":\"" + slots[i].plant_id + "\",\"status\":\"stop\"}";
    socketIOEmit("esp:wateringEvent", evt);
    httpUpdateWatering(slots[i].plant_id, false);
  }
}

// ---------------- Arduino lifecycle ----------------

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n[boot] STATE: Hydro Sprayer ESP32 firmware starting...");
  Serial.printf("[boot] STATE: server target: %s://%s:%d\n", SERVER_USE_SSL ? "https" : "http", SERVER_HOST, SERVER_PORT);
  Serial.printf("[boot] STATE: owner UID: %s\n", OWNER_UID);

  if (SERVER_USE_SSL) {
    secureClient.setInsecure(); // skip TLS cert validation (simple, not hardened)
    Serial.println("[boot] STATE: TLS client configured (certificate validation disabled).");
  }

  for (int i = 0; i < NUM_SLOTS; i++) {
    pinMode(RELAY_PINS[i], OUTPUT);
    relayWrite(RELAY_PINS[i], false); // start with all pumps off
    pinMode(MOISTURE_PINS[i], INPUT);
    Serial.printf("[boot] STATE: slot %d wired: moisture_pin=GPIO%d relay_pin=GPIO%d (off)\n",
         i + 1, MOISTURE_PINS[i], RELAY_PINS[i]);
  }

  connectWiFi();
  fetchPlantConfig();
  setupSocketIO();

  lastConfigFetch = millis();
  lastMoistureRead = millis();
  lastHeartbeat = millis();

  Serial.println("[boot] STATE: setup complete. Entering main loop.\n");
}

void loop() {
  webSocket.loop();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[wifi] STATE: connection lost, reconnecting...");
    connectWiFi();
  }

  unsigned long now = millis();

  if (now - lastConfigFetch >= PLANT_CONFIG_REFRESH_MS) {
    lastConfigFetch = now;
    Serial.println("[loop] STATE: periodic plant config refresh triggered.");
    fetchPlantConfig();
  }

  if (now - lastMoistureRead >= MOISTURE_READ_INTERVAL_MS) {
    lastMoistureRead = now;
    for (int i = 0; i < NUM_SLOTS; i++) {
      handleSlot(i);
    }
  }

  if (now - lastHeartbeat >= HEARTBEAT_MS) {
    lastHeartbeat = now;
    Serial.printf("[heartbeat] STATE: uptime=%lus wifi=%s socket=%s namespace=%s heap=%u\n",
         now / 1000,
         WiFi.status() == WL_CONNECTED ? "up" : "down",
         socketConnected ? "up" : "down",
         namespaceConnected ? "joined" : "no",
         ESP.getFreeHeap());
  }
}
