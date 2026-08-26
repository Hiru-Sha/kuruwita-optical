const router = require("express").Router();
const controller = require("../controllers/report.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// ADMIN only (reports)
router.get("/summary", auth, role(["ADMIN"]), controller.summary);
router.get("/daily", auth, role(["ADMIN"]), controller.daily);
router.get("/low-stock", auth, role(["ADMIN"]), controller.lowStock);

module.exports = router;