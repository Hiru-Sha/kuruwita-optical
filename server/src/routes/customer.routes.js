const router = require("express").Router();
const controller = require("../controllers/customer.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// ADMIN + CASHIER can create/update
router.post("/", auth, role(["ADMIN", "CASHIER"]), controller.createCustomer);
router.put("/:id", auth, role(["ADMIN", "CASHIER"]), controller.updateCustomer);

// ADMIN only delete
router.delete("/:id", auth, role(["ADMIN"]), controller.deleteCustomer);

// any logged-in user can view
router.get("/", auth, controller.getAllCustomers);
router.get("/:id", auth, controller.getCustomer);

module.exports = router;