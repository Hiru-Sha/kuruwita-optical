const router = require("express").Router();
const controller = require("../controllers/prescription.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// Create prescription (ADMIN + CASHIER)
router.post("/", auth, role(["ADMIN", "CASHIER"]), controller.createPrescription);

// Get prescriptions by customer
router.get("/customer/:customerId", auth, controller.getCustomerPrescriptions);

// Delete prescription (ADMIN only)
router.delete("/:id", auth, role(["ADMIN"]), controller.deletePrescription);

module.exports = router;