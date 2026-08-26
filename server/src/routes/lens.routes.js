const router = require("express").Router();
const controller = require("../controllers/lens.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// View
router.get("/", auth, controller.getAllLenses);
router.get("/:id", auth, controller.getLens);

// Manage (ADMIN)
router.post("/", auth, role(["ADMIN"]), controller.createLens);
router.put("/:id", auth, role(["ADMIN"]), controller.updateLens);
router.delete("/:id", auth, role(["ADMIN"]), controller.deleteLens);

// Stock adjust
router.patch("/:id/stock", auth, role(["ADMIN"]), controller.adjustLensStock);

module.exports = router;