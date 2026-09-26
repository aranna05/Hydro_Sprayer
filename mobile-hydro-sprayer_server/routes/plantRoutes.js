const express = require("express");
const router = express.Router();
const plantController = require("../controllers/plantController");

router.post("/", plantController.addPlant);
router.get("/:uid", plantController.listForUser);
router.get("/single/:plantId", plantController.getOne);
router.put("/:plantId", plantController.updatePlant);
router.delete("/:plantId", plantController.deletePlant);

module.exports = router;
