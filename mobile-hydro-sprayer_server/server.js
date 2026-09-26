require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const registerSocketHandlers = require("./socket/socketHandler");

const userRoutes = require("./routes/userRoutes");
const plantRoutes = require("./routes/plantRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const espRoutes = require("./routes/espRoutes");

const PORT = process.env.PORT || 5000;
const ORIGINS = (process.env.CLIENT_ORIGINS || "*").split(",");

async function start() {
  await connectDB();

  const app = express();
  app.use(cors({ origin: ORIGINS }));
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: ORIGINS, methods: ["GET", "POST", "PUT", "DELETE"] },
  });
  registerSocketHandlers(io);

  // Make io available inside route controllers via req.app.get("io")
  app.set("io", io);

  app.get("/", (req, res) => res.json({ status: "ok", message: "IoT Water Monitoring API" }));
  app.use("/api/users", userRoutes);
  app.use("/api/plants", plantRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/esp", espRoutes);

  // 404 fallback
  app.use((req, res) => res.status(404).json({ message: "Route not found" }));

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("[unhandled error]", err);
    res.status(500).json({ message: "Unexpected server error" });
  });

  server.listen(PORT, () => console.log(`[server] listening on port ${PORT}`));
}

start();
