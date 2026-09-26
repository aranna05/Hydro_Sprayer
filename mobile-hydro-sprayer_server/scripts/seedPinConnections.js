//seedPinConnections.js

// Run once: `npm run seed:pins`
// Populates the fixed 5 sensor/relay pin wiring slots that match the
// hard-coded SENSOR_CONFIGS array in esp32/water_monitoring_esp32.ino.
// Safe to re-run: it upserts by sensor_index instead of duplicating.

require("dotenv").config();
const connectDB = require("../config/db");
const PinConnection = require("../models/PinConnection");
const mongoose = require("mongoose");

const PIN_SLOTS = [
  {
    sensor_index: 1,
    moisture_pin: "GPIO36",
    relay_pin: "GPIO17",
    pin_connection_description:
      "GPIO36 -> Data pin Capacitive Moisture Sensor 1, GND -> Breadboard Blue Line, VCC -> Breadboard Red Line && Power Supply Positive -> Relay NO, Relay NC -> Water Pump Positive, Water Pump Negative -> Power Supply Negative, Relay GND -> Breadboard Blue Line, Relay VCC -> Breadboard Red Line, Relay Data -> GPIO17.",
  },
  {
    sensor_index: 2,
    moisture_pin: "GPIO39",
    relay_pin: "GPIO4",
    pin_connection_description:
      "GPIO39 -> Data pin Capacitive Moisture Sensor 2, GND -> Breadboard Blue Line, VCC -> Breadboard Red Line && Power Supply Positive -> Relay NO, Relay NC -> Water Pump Positive, Water Pump Negative -> Power Supply Negative, Relay GND -> Breadboard Blue Line, Relay VCC -> Breadboard Red Line, Relay Data -> GPIO4.",
  },
  {
    sensor_index: 3,
    moisture_pin: "GPIO34",
    relay_pin: "GPIO13",
    pin_connection_description:
      "GPIO34 -> Data pin Capacitive Moisture Sensor 3, GND -> Breadboard Blue Line, VCC -> Breadboard Red Line && Power Supply Positive -> Relay NO, Relay NC -> Water Pump Positive, Water Pump Negative -> Power Supply Negative, Relay GND -> Breadboard Blue Line, Relay VCC -> Breadboard Red Line, Relay Data -> GPIO13.",
  },
  {
    sensor_index: 4,
    moisture_pin: "GPIO35",
    relay_pin: "GPIO16",
    pin_connection_description:
      "GPIO35 -> Data pin Capacitive Moisture Sensor 4, GND -> Breadboard Blue Line, VCC -> Breadboard Red Line && Power Supply Positive -> Relay NO, Relay NC -> Water Pump Positive, Water Pump Negative -> Power Supply Negative, Relay GND -> Breadboard Blue Line, Relay VCC -> Breadboard Red Line, Relay Data -> GPIO16.",
  },
  {
    sensor_index: 5,
    moisture_pin: "GPIO32",
    relay_pin: "GPIO18",
    pin_connection_description:
      "GPIO32 -> Data pin Capacitive Moisture Sensor 5, GND -> Breadboard Blue Line, VCC -> Breadboard Red Line && Power Supply Positive -> Relay NO, Relay NC -> Water Pump Positive, Water Pump Negative -> Power Supply Negative, Relay GND -> Breadboard Blue Line, Relay VCC -> Breadboard Red Line, Relay Data -> GPIO18.",
  },
];

(async () => {
  await connectDB();
  for (const slot of PIN_SLOTS) {
    await PinConnection.findOneAndUpdate(
      { sensor_index: slot.sensor_index },
      { $setOnInsert: slot },
      { upsert: true, new: true }
    );
  }
  console.log(`[seed] ${PIN_SLOTS.length} pin connection slots ready.`);
  await mongoose.connection.close();
  process.exit(0);
})();
