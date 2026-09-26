const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/:uid", notificationController.listForUser);
router.put("/:id/read", notificationController.markRead);

module.exports = router;
