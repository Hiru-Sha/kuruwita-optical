const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function calcStatus(totalCost, paidAmount) {
  if (paidAmount >= totalCost) return "PAID";
  if (paidAmount > 0) return "PARTIAL";
  return "CREDIT";
}

exports.createPurchase = async (req, res) => {
  try {
    const { supplierId, paidAmount = 0, items = [] } = req.body;

    if (!supplierId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "supplierId and items are required" });
    }

    // items: [{ itemType:"FRAME"/"LENS", itemId, quantity, unitCost }]
    const totalCost = items.reduce((sum, it) => sum + (Number(it.unitCost) * Number(it.quantity)), 0);
    const status = calcStatus(totalCost, Number(paidAmount));

    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          supplierId: Number(supplierId),
          totalCost,
          paidAmount: Number(paidAmount),
          status,
        },
      });

      // create purchase items, update stock, log stock movement
      for (const it of items) {
        const itemType = String(it.itemType).toUpperCase();
        const itemId = Number(it.itemId);
        const quantity = Number(it.quantity);
        const unitCost = Number(it.unitCost);

        await tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            itemType,
            itemId,
            quantity,
            unitCost,
          },
        });

        if (itemType === "FRAME") {
          const frame = await tx.frame.findUnique({ where: { id: itemId } });
          if (!frame) throw new Error(`Frame not found: ${itemId}`);

          await tx.frame.update({
            where: { id: itemId },
            data: { stockQty: frame.stockQty + quantity, costPrice: unitCost },
          });

          await tx.stockMovement.create({
            data: { itemType: "FRAME", itemId, quantity, direction: "IN", reason: "purchase" },
          });
        } else if (itemType === "LENS") {
          const lens = await tx.lens.findUnique({ where: { id: itemId } });
          if (!lens) throw new Error(`Lens not found: ${itemId}`);

          await tx.lens.update({
            where: { id: itemId },
            data: { stockQty: lens.stockQty + quantity, costPrice: unitCost },
          });

          await tx.stockMovement.create({
            data: { itemType: "LENS", itemId, quantity, direction: "IN", reason: "purchase" },
          });
        } else {
          throw new Error(`Invalid itemType: ${itemType}`);
        }
      }

      return purchase;
    });

    res.status(201).json({ message: "Purchase (GRN) created ✅", purchase: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Error creating purchase" });
  }
};

exports.getAllPurchases = async (req, res) => {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: "desc" },
    include: { supplier: true, items: true },
  });
  res.json(purchases);
};

exports.getPurchase = async (req, res) => {
  const id = Number(req.params.id);
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: { supplier: true, items: true },
  });
  if (!purchase) return res.status(404).json({ message: "Purchase not found" });
  res.json(purchase);
};