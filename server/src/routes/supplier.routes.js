const router = require("express").Router();
const controller = require("../controllers/supplier.controller");
const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// View (logged in)
router.get("/", auth, controller.getAllSuppliers);
router.get("/:id", auth, controller.getSupplier);

// Manage (ADMIN only)
router.post("/", auth, role(["ADMIN"]), controller.createSupplier);
router.put("/:id", auth, role(["ADMIN"]), controller.updateSupplier);
router.delete("/:id", auth, role(["ADMIN"]), controller.deleteSupplier);

module.exports = router;