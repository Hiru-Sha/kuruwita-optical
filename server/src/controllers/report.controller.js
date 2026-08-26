const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/reports/summary?from=2026-02-01&to=2026-02-22
exports.summary = async (req, res) => {
  try {
    const { from, to } = req.query;

    const where = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        // include entire "to" date
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      select: { total: true, profit: true, cogs: true, createdAt: true },
    });

    const totalSales = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
    const totalProfit = invoices.reduce((s, i) => s + Number(i.profit || 0), 0);
    const totalCogs = invoices.reduce((s, i) => s + Number(i.cogs || 0), 0);

    res.json({
      from: from || null,
      to: to || null,
      invoiceCount: invoices.length,
      totalSales,
      totalProfit,
      totalCogs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Report summary error" });
  }
};

// GET /api/reports/daily?from=2026-02-01&to=2026-02-22
exports.daily = async (req, res) => {
  try {
    const { from, to } = req.query;
    const where = {};

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const invoices = await prisma.invoice.findMany({
      where,
      select: { createdAt: true, total: true, profit: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by date (YYYY-MM-DD)
    const map = {};
    for (const inv of invoices) {
      const d = new Date(inv.createdAt);
      const key = d.toISOString().slice(0, 10);
      if (!map[key]) map[key] = { date: key, sales: 0, profit: 0, count: 0 };
      map[key].sales += Number(inv.total || 0);
      map[key].profit += Number(inv.profit || 0);
      map[key].count += 1;
    }

    res.json(Object.values(map));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Daily report error" });
  }
};

// GET /api/reports/low-stock
exports.lowStock = async (req, res) => {
  try {
    const frames = await prisma.frame.findMany({
      where: { stockQty: { lte: prisma.frame.fields.reorderLevel } }, // may not work in older prisma
    });

    // fallback if above fails: fetch all and filter
    // But easiest: just fetch all and filter in JS for now
    // (We'll do JS filter for compatibility)
  } catch (e) {}

  try {
    const allFrames = await prisma.frame.findMany();
    const allLenses = await prisma.lens.findMany();

    const lowFrames = allFrames.filter((f) => Number(f.stockQty) <= Number(f.reorderLevel));
    const lowLenses = allLenses.filter((l) => Number(l.stockQty) <= Number(l.reorderLevel));

    res.json({
      frames: lowFrames,
      lenses: lowLenses,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Low stock report error" });
  }
};