const Plant = require("../models/Plant");
const PinConnection = require("../models/PinConnection");
const { createNotification } = require("./notificationController");

const MAX_PLANTS_PER_USER = 5;

// POST /api/plants
// Body: { uid, plant_name, preferred_moisture }
// Server auto-assigns planting_date and a free pin_connection.
exports.addPlant = async (req, res) => {
  try {
    const { uid, plant_name, preferred_moisture } = req.body;
    if (!uid || !plant_name || preferred_moisture === undefined) {
      return res.status(400).json({ message: "uid, plant_name and preferred_moisture are required" });
    }

    console.log(res)

    const count = await Plant.countDocuments({ uid });
    if (count >= MAX_PLANTS_PER_USER) {
      return res.status(400).json({ message: `A user can add a maximum of ${MAX_PLANTS_PER_USER} plants` });
    }

    // Find a free pin connection slot and claim it atomically.
    const pin = await PinConnection.findOneAndUpdate(
      { is_assigned: false },
      { $set: { is_assigned: true } },
      { new: true }
    );
    if (!pin) {
      return res.status(409).json({ message: "No free sensor/pump pin slots available" });
    }

    try {
      const plant = await Plant.create({
        plant_name,
        preferred_moisture,
        planting_date: new Date(),
        uid,
        pin_connection_id: pin._id,
        pin_connection_description: pin.pin_connection_description,
      });

      pin.assigned_plant_id = plant._id;
      await pin.save();

      const io = req.app.get("io");
      if (io) io.to(uid).emit("plantAdded", plant);

      return res.status(201).json({ message: "Plant added", plant });
    } catch (createErr) {
      // Roll back the pin claim if plant creation failed (e.g. unique index conflict).
      pin.is_assigned = false;
      pin.assigned_plant_id = null;
      await pin.save();
      throw createErr;
    }
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This pin connection is already used for this user" });
    }
    console.error("[addPlant]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/plants/:uid
exports.listForUser = async (req, res) => {
  try {
    const plants = await Plant.find({ uid: req.params.uid }).sort({ planting_date: -1 });
    return res.json({ plants });
  } catch (err) {
    console.error("[listForUser]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/plants/single/:plantId
exports.getOne = async (req, res) => {
  try {
    const plant = await Plant.findById(req.params.plantId);
    if (!plant) return res.status(404).json({ message: "Plant not found" });
    return res.json({ plant });
  } catch (err) {
    console.error("[getOne]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/plants/:plantId
// Body: { plant_name?, preferred_moisture? }
exports.updatePlant = async (req, res) => {
  try {
    const { plant_name, preferred_moisture } = req.body;
    const update = {};
    if (plant_name) update.plant_name = plant_name;
    if (preferred_moisture !== undefined) update.preferred_moisture = preferred_moisture;

    const plant = await Plant.findByIdAndUpdate(req.params.plantId, update, { new: true });
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    const io = req.app.get("io");
    if (io) io.to(plant.uid).emit("plantUpdated", plant);

    return res.json({ message: "Plant updated", plant });
  } catch (err) {
    console.error("[updatePlant]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/plants/:plantId
exports.deletePlant = async (req, res) => {
  try {
    const plant = await Plant.findByIdAndDelete(req.params.plantId);
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    await PinConnection.findByIdAndUpdate(plant.pin_connection_id, {
      is_assigned: false,
      assigned_plant_id: null,
    });

    const io = req.app.get("io");
    if (io) io.to(plant.uid).emit("plantDeleted", { _id: plant._id });

    return res.json({ message: "Plant deleted" });
  } catch (err) {
    console.error("[deletePlant]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------- ESP32-facing endpoints ----------

// GET /api/esp/plants/:uid
// The ESP32 calls this on boot / periodically to load which sensors & pumps
// are active for this uid, plus each plant's preferred moisture threshold.
exports.getPlantsForEsp = async (req, res) => {
  try {
    const plants = await Plant.find({ uid: req.params.uid }).populate("pin_connection_id");
    const payload = plants.map((p) => ({
      plant_id: p._id,
      plant_name: p.plant_name,
      preferred_moisture: p.preferred_moisture,
      sensor_index: p.pin_connection_id.sensor_index,
      moisture_pin: p.pin_connection_id.moisture_pin,
      relay_pin: p.pin_connection_id.relay_pin,
    }));
    return res.json({ uid: req.params.uid, plants: payload });
  } catch (err) {
    console.error("[getPlantsForEsp]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/esp/plants/:plantId/moisture
// Body: { current_moisture }
exports.updateMoisture = async (req, res) => {
  try {
    const { current_moisture } = req.body;
    if (current_moisture === undefined) {
      return res.status(400).json({ message: "current_moisture is required" });
    }
    const plant = await Plant.findByIdAndUpdate(
      req.params.plantId,
      { current_moisture },
      { new: true }
    );
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    const io = req.app.get("io");
    if (io) io.to(plant.uid).emit("moistureUpdate", { plant_id: plant._id, current_moisture });

    return res.json({ message: "Moisture updated" });
  } catch (err) {
    console.error("[updateMoisture]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/esp/plants/:plantId/watering
// Body: { status: "start" | "stop" }
// Called by the ESP32 when a pump turns on/off. "start" creates a notification
// and stamps last_watering_time; "stop" just clears the is_watering flag.
exports.updateWateringStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["start", "stop"].includes(status)) {
      return res.status(400).json({ message: "status must be 'start' or 'stop'" });
    }

    const update = { is_watering: status === "start" };
    if (status === "start") update.last_watering_time = new Date();

    const plant = await Plant.findByIdAndUpdate(req.params.plantId, update, { new: true });
    if (!plant) return res.status(404).json({ message: "Plant not found" });

    const io = req.app.get("io");

    if (status === "start") {
      const notification = await createNotification({
        uid: plant.uid,
        title: `Watering started: ${plant.plant_name}`,
        details: `${plant.plant_name} watering started at ${update.last_watering_time.toLocaleString()}.`,
      });
      if (io) io.to(plant.uid).emit("newNotification", notification);
    }

    if (io) io.to(plant.uid).emit("plantUpdated", plant);

    return res.json({ message: "Watering status updated", plant });
  } catch (err) {
    console.error("[updateWateringStatus]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
