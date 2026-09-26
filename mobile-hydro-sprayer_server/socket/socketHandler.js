const Plant = require("../models/Plant");
const { createNotification } = require("../controllers/notificationController");

// Every client (mobile app AND the ESP32) joins a room named after the uid,
// so events are scoped per-user instead of broadcast globally.
module.exports = function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log(`[socket] client connected: ${socket.id}`);

    socket.on("join", (uid) => {
      if (!uid) return;
      socket.join(uid);
      socket.data.uid = uid;
      console.log(`[socket] ${socket.id} joined room ${uid}`);
    });

    // ESP32 -> server: live moisture reading (in addition to the HTTP PUT,
    // for lower-latency gauge updates on the mobile app).
    socket.on("esp:moistureReading", async ({ plant_id, current_moisture }) => {
      try {
        if (!plant_id || current_moisture === undefined) return;
        const plant = await Plant.findByIdAndUpdate(
          plant_id,
          { current_moisture },
          { new: true }
        );
        if (!plant) return;
        io.to(plant.uid).emit("moistureUpdate", { plant_id, current_moisture });
      } catch (err) {
        console.error("[socket esp:moistureReading]", err);
      }
    });

    // ESP32 -> server: pump started/stopped.
    socket.on("esp:wateringEvent", async ({ plant_id, status }) => {
      try {
        if (!plant_id || !["start", "stop"].includes(status)) return;
        const update = { is_watering: status === "start" };
        if (status === "start") update.last_watering_time = new Date();

        const plant = await Plant.findByIdAndUpdate(plant_id, update, { new: true });
        if (!plant) return;

        if (status === "start") {
          const notification = await createNotification({
            uid: plant.uid,
            title: `Watering started: ${plant.plant_name}`,
            details: `${plant.plant_name} watering started at ${update.last_watering_time.toLocaleString()}.`,
          });
          io.to(plant.uid).emit("newNotification", notification);
        }

        io.to(plant.uid).emit("plantUpdated", plant);
      } catch (err) {
        console.error("[socket esp:wateringEvent]", err);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket] client disconnected: ${socket.id}`);
    });
  });
};
