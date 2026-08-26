const router = require("express").Router();
const controller = require("../controllers/purchase.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// ADMIN only
router.post("/", auth, role(["ADMIN"]), controller.createPurchase);

// View purchases
router.get("/", auth, role(["ADMIN"]), controller.getAllPurchases);
router.get("/:id", auth, role(["ADMIN"]), controller.getPurchase);

module.exports = router;