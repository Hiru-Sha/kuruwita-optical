const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createSupplier = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const supplier = await prisma.supplier.create({
      data: { name, phone, address },
    });

    res.status(201).json(supplier);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating supplier" });
  }
};

exports.getAllSuppliers = async (req, res) => {
  const suppliers = await prisma.supplier.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(suppliers);
};

exports.getSupplier = async (req, res) => {
  const id = parseInt(req.params.id);
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { purchases: true },
  });
  if (!supplier) return res.status(404).json({ message: "Supplier not found" });
  res.json(supplier);
};

exports.updateSupplier = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updated = await prisma.supplier.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating supplier" });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.supplier.delete({ where: { id } });
    res.json({ message: "Supplier deleted ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting supplier" });
  }
};
