const mongoose = require("mongoose");

const dns = require("dns");

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is not set in .env");
    }
    await mongoose.connect(uri);
    console.log("[db] Connected to MongoDB Atlas");
  } catch (err) {
    console.error("[db] Connection failed:", err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
