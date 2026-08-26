const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createLens = async (req, res) => {
  try {
    const { sku, type, index, coating, costPrice, sellPrice, stockQty, reorderLevel } = req.body;

    if (!sku || !type || !index || costPrice == null || sellPrice == null) {
      return res.status(400).json({ message: "sku, type, index, costPrice, sellPrice required" });
    }

    const lens = await prisma.lens.create({
      data: {
        sku,
        type,
        index,
        coating,
        costPrice: parseFloat(costPrice),
        sellPrice: parseFloat(sellPrice),
        stockQty: stockQty ? parseInt(stockQty) : 0,
        reorderLevel: reorderLevel ? parseInt(reorderLevel) : 5
      }
    });

    res.status(201).json(lens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating lens" });
  }
};

exports.getAllLenses = async (req, res) => {
  const lenses = await prisma.lens.findMany({
    orderBy: { createdAt: "desc" }
  });
  res.json(lenses);
};

exports.getLens = async (req, res) => {
  const id = parseInt(req.params.id);
  const lens = await prisma.lens.findUnique({ where: { id } });

  if (!lens) return res.status(404).json({ message: "Lens not found" });

  res.json(lens);
};

exports.updateLens = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const updated = await prisma.lens.update({
      where: { id },
      data: req.body
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating lens" });
  }
};

exports.deleteLens = async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.lens.delete({ where: { id } });

  res.json({ message: "Lens deleted ✅" });
};

exports.adjustLensStock = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, direction, reason } = req.body;

    const qty = parseInt(quantity);
    const dir = direction.toUpperCase();

    const lens = await prisma.lens.findUnique({ where: { id } });
    if (!lens) return res.status(404).json({ message: "Lens not found" });

    let newQty = lens.stockQty;

    if (dir === "IN") newQty += qty;
    else if (dir === "OUT") newQty -= qty;
    else return res.status(400).json({ message: "direction must be IN or OUT" });

    if (newQty < 0)
      return res.status(400).json({ message: "Stock cannot go below 0" });

    const updated = await prisma.lens.update({
      where: { id },
      data: { stockQty: newQty }
    });

    await prisma.stockMovement.create({
      data: {
        itemType: "LENS",
        itemId: id,
        quantity: qty,
        direction: dir,
        reason: reason || "adjustment"
      }
    });

    res.json({ message: "Stock updated ✅", lens: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adjusting stock" });
  }
};