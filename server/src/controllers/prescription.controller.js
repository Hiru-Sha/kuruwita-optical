const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createPrescription = async (req, res) => {
  try {
    const {
      customerId,
      rightSPH,
      rightCYL,
      rightAXIS,
      rightADD,
      leftSPH,
      leftCYL,
      leftAXIS,
      leftADD,
      pd,
      doctor
    } = req.body;

    const prescription = await prisma.prescription.create({
      data: {
        customerId: parseInt(customerId),
        rightSPH,
        rightCYL,
        rightAXIS,
        rightADD,
        leftSPH,
        leftCYL,
        leftAXIS,
        leftADD,
        pd,
        doctor
      }
    });

    res.status(201).json(prescription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating prescription" });
  }
};

exports.getCustomerPrescriptions = async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);

    const prescriptions = await prisma.prescription.findMany({
      where: { customerId },
      orderBy: { date: "desc" }
    });

    res.json(prescriptions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching prescriptions" });
  }
};

exports.deletePrescription = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await prisma.prescription.delete({ where: { id } });

    res.json({ message: "Prescription deleted ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting prescription" });
  }
};