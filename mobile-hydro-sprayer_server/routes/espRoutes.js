const express = require("express");
const router = express.Router();
const plantController = require("../controllers/plantController");

// Endpoints called by the ESP32 firmware only.
router.get("/plants/:uid", plantController.getPlantsForEsp);
router.put("/plants/:plantId/moisture", plantController.updateMoisture);
router.put("/plants/:plantId/watering", plantController.updateWateringStatus);

module.exports = router;
