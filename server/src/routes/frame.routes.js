const router = require("express").Router();
const controller = require("../controllers/frame.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// View (any logged-in user)
router.get("/", auth, controller.getAllFrames);
router.get("/:id", auth, controller.getFrame);

// Manage (ADMIN only for now)
router.post("/", auth, role(["ADMIN"]), controller.createFrame);
router.put("/:id", auth, role(["ADMIN"]), controller.updateFrame);
router.delete("/:id", auth, role(["ADMIN"]), controller.deleteFrame);

// Stock adjust (ADMIN)
router.patch("/:id/stock", auth, role(["ADMIN"]), controller.adjustFrameStock);

module.exports = router;