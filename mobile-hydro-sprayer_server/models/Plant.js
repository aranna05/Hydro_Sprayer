const mongoose = require("mongoose");

const plantSchema = new mongoose.Schema(
  {
    plant_name: { type: String, required: true, trim: true },
    preferred_moisture: { type: Number, required: true, min: 0, max: 100 },
    planting_date: { type: Date, default: Date.now },
    last_watering_time: { type: Date, default: null },
    current_moisture: { type: Number, default: null }, // last reading pushed by the ESP32
    is_watering: { type: Boolean, default: false },
    pin_connection_description: { type: String, required: true }, // denormalized copy for quick display
    uid: { type: String, required: true, index: true },
    pin_connection_id: { type: mongoose.Schema.Types.ObjectId, ref: "PinConnection", required: true },
  },
  { versionKey: false }
);

// A user cannot use the same pin connection twice, and the same pin
// connection cannot be reused across users while assigned.
plantSchema.index({ uid: 1, pin_connection_id: 1 }, { unique: true });

module.exports = mongoose.model("Plant", plantSchema);
