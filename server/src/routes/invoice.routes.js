const router = require("express").Router();
const controller = require("../controllers/invoice.controller");

const auth = require("../middlewares/auth.middleware");
const role = require("../middlewares/role.middleware");

// GET all invoices
router.get("/", auth, role(["ADMIN", "CASHIER"]), controller.getAllInvoices);

// GET one invoice
router.get("/:id", auth, role(["ADMIN", "CASHIER"]), controller.getInvoice);

// PDF
router.get("/:id/pdf", auth, role(["ADMIN", "CASHIER"]), controller.generateInvoicePDF);

// ADD PAYMENT ✅
router.post("/:id/payments", auth, role(["ADMIN", "CASHIER"]), controller.addPayment);

// CREATE invoice
router.post("/", auth, role(["ADMIN", "CASHIER"]), controller.createInvoice);

module.exports = router;