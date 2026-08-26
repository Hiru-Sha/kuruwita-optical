const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.createFrame = async (req, res) => {
  try {
    const { sku, brand, model, color, size, costPrice, sellPrice, stockQty, reorderLevel } = req.body;

    if (!sku || !brand || !model || costPrice == null || sellPrice == null) {
      return res.status(400).json({ message: "sku, brand, model, costPrice, sellPrice required" });
    }

    const created = await prisma.frame.create({
      data: {
        sku,
        brand,
        model,
        color,
        size,
        costPrice: parseFloat(costPrice),
        sellPrice: parseFloat(sellPrice),
        stockQty: stockQty ? parseInt(stockQty) : 0,
        reorderLevel: reorderLevel ? parseInt(reorderLevel) : 5,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating frame" });
  }
};

exports.getAllFrames = async (req, res) => {
  const frames = await prisma.frame.findMany({ orderBy: { createdAt: "desc" } });
  res.json(frames);
};

exports.getFrame = async (req, res) => {
  const id = parseInt(req.params.id);
  const frame = await prisma.frame.findUnique({ where: { id } });
  if (!frame) return res.status(404).json({ message: "Frame not found" });
  res.json(frame);
};

exports.updateFrame = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const updated = await prisma.frame.update({
      where: { id },
      data: req.body,
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error updating frame" });
  }
};

exports.deleteFrame = async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.frame.delete({ where: { id } });
  res.json({ message: "Frame deleted ✅" });
};

exports.adjustFrameStock = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { quantity, direction, reason } = req.body;

    if (!quantity || !direction) {
      return res.status(400).json({ message: "quantity and direction required" });
    }

    const qty = parseInt(quantity);
    const dir = direction.toUpperCase();

    const frame = await prisma.frame.findUnique({ where: { id } });
    if (!frame) return res.status(404).json({ message: "Frame not found" });

    let newQty = frame.stockQty;

    if (dir === "IN") newQty += qty;
    else if (dir === "OUT") newQty -= qty;
    else return res.status(400).json({ message: "direction must be IN or OUT" });

    if (newQty < 0) return res.status(400).json({ message: "Stock cannot go below 0" });

    const updated = await prisma.frame.update({
      where: { id },
      data: { stockQty: newQty },
    });

    await prisma.stockMovement.create({
      data: {
        itemType: "FRAME",
        itemId: id,
        quantity: qty,
        direction: dir,
        reason: reason || "adjustment",
      },
    });

    res.json({ message: "Stock updated ✅", frame: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error adjusting stock" });
  }
};