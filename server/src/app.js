const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const customerRoutes = require("./routes/customer.routes");
const prescriptionRoutes = require("./routes/prescription.routes");
const frameRoutes = require("./routes/frame.routes");
const lensRoutes = require("./routes/lens.routes");
const supplierRoutes = require("./routes/supplier.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const invoiceRoutes = require("./routes/invoice.routes");
const reportRoutes = require("./routes/report.routes");


const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Kuruwita Optical API is running ✅" });
});

app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/frames", frameRoutes);
app.use("/api/lenses", lensRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/reports", reportRoutes);

module.exports = app;