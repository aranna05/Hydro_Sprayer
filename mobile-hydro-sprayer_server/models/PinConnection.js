const mongoose = require("mongoose");

// This collection is pre-seeded (see scripts/seedPinConnections.js) with the
// fixed set of physical sensor/relay pin wiring descriptions that are already
// hard-coded into the ESP32 firmware. When a user adds a plant, the server
// assigns one free (unassigned) pin_connection document to that plant.
const pinConnectionSchema = new mongoose.Schema(
  {
    sensor_index: { type: Number, required: true, unique: true }, // 1-5, matches firmware SENSOR_CONFIGS index
    pin_connection_description: { type: String, required: true },
    moisture_pin: { type: String, required: true }, // e.g. "GPIO36"
    relay_pin: { type: String, required: true }, // e.g. "GPIO17"
    is_assigned: { type: Boolean, default: false },
    assigned_plant_id: { type: mongoose.Schema.Types.ObjectId, ref: "Plant", default: null },
  },
  { versionKey: false }
);

module.exports = mongoose.model("PinConnection", pinConnectionSchema);
