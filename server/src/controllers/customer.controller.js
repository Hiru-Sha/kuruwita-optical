const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, address, nic } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "name and phone are required" });
    }

    const customer = await prisma.customer.create({
      data: { name, phone, address, nic },
    });

    res.status(201).json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating customer" });
  }
};

exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching customers" });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { prescriptions: true },
    });

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    res.json(customer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching customer" });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const exists = await prisma.customer.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: "Customer not found" });

    const updated = await prisma.customer.update({
      where: { id },
      data: req.body,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating customer" });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const exists = await prisma.customer.findUnique({ where: { id } });
    if (!exists) return res.status(404).json({ message: "Customer not found" });

    await prisma.customer.delete({ where: { id } });

    res.json({ message: "Customer deleted ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting customer" });
  }
};