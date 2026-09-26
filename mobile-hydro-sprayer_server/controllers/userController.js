const User = require("../models/User");

// POST /api/users
// Called right after successful Firebase sign-up on the client.
// Body: { name, email, uid, phone_number }
exports.createUser = async (req, res) => {
  try {
    const { name, email, uid, phone_number } = req.body;
    if (!name || !email || !uid || !phone_number) {
      return res.status(400).json({ message: "name, email, uid and phone_number are required" });
    }

    const existing = await User.findOne({ uid });
    if (existing) {
      return res.status(200).json({ message: "User already exists", user: existing });
    }

    const user = await User.create({
      name,
      email,
      uid,
      phone_number,
      created_account_date: new Date(),
    });

    return res.status(201).json({ message: "User created", user });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email or UID already registered" });
    }
    console.error("[createUser]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/users/:uid
exports.getUser = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ user });
  } catch (err) {
    console.error("[getUser]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/users/:uid
// Update profile fields (name/phone). Password changes happen client-side via Firebase.
exports.updateUser = async (req, res) => {
  try {
    const { name, phone_number } = req.body;
    const update = {};
    if (name) update.name = name;
    if (phone_number) update.phone_number = phone_number;

    const user = await User.findOneAndUpdate({ uid: req.params.uid }, update, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.json({ message: "Profile updated", user });
  } catch (err) {
    console.error("[updateUser]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
