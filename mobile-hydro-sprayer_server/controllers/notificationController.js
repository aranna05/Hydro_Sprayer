const Notification = require("../models/Notification");

// GET /api/notifications/:uid
exports.listForUser = async (req, res) => {
  try {
    const notifications = await Notification.find({ uid: req.params.uid }).sort({ date: -1 }).limit(100);
    return res.json({ notifications });
  } catch (err) {
    console.error("[listForUser]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(req.params.id, { is_read: true }, { new: true });
    if (!notification) return res.status(404).json({ message: "Notification not found" });
    return res.json({ notification });
  } catch (err) {
    console.error("[markRead]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Internal helper used by other controllers/socket handlers — not a route.
exports.createNotification = async ({ uid, title, details }) => {
  return Notification.create({ uid, title, details, date: new Date() });
};
