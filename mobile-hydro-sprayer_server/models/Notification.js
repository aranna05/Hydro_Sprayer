const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    title: { type: String, required: true },
    details: { type: String, required: true },
    uid: { type: String, required: true, index: true },
    is_read: { type: Boolean, default: false },
  },
  { versionKey: false }
);

module.exports = mongoose.model("Notification", notificationSchema);
