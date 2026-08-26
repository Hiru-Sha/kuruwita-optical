const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function makeInvoiceNo() {
  // Example: INV-20260221-0001
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `INV-${y}${m}${day}`;
}

exports.createInvoice = async (req, res) => {
  try {
    const { customerId, discount = 0, items = [], payment } = req.body;

    /**
     * items = [
     *   { itemType: "FRAME"|"LENS", itemId: 1, quantity: 1, unitPrice?: 9500 }
     * ]
     * payment = { amount: 5000, method: "CASH"|"CARD"|"TRANSFER" }
     */

    if (!customerId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "customerId and items are required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate invoiceNo with daily counter
      const prefix = makeInvoiceNo(); // INV-YYYYMMDD
      const todayCount = await tx.invoice.count({
        where: { invoiceNo: { startsWith: prefix } },
      });
      const invoiceNo = `${prefix}-${String(todayCount + 1).padStart(4, "0")}`;

      let subtotal = 0;
      let cogs = 0;

      // Prepare validated items with cost and prices
      const preparedItems = [];

      for (const it of items) {
        const itemType = String(it.itemType).toUpperCase();
        const itemId = Number(it.itemId);
        const quantity = Number(it.quantity);

        if (!itemId || !quantity || quantity <= 0) {
          throw new Error("Invalid itemId/quantity");
        }

        if (itemType === "FRAME") {
          const frame = await tx.frame.findUnique({ where: { id: itemId } });
          if (!frame) throw new Error(`Frame not found: ${itemId}`);
          if (frame.stockQty < quantity) throw new Error(`Not enough frame stock for ${frame.sku}`);

          const unitPrice = it.unitPrice != null ? Number(it.unitPrice) : frame.sellPrice;
          const unitCost = frame.costPrice;

          subtotal += unitPrice * quantity;
          cogs += unitCost * quantity;

          preparedItems.push({ itemType, itemId, quantity, unitPrice, unitCost });

          // stock OUT + movement
          await tx.frame.update({
            where: { id: itemId },
            data: { stockQty: frame.stockQty - quantity },
          });

          await tx.stockMovement.create({
            data: { itemType: "FRAME", itemId, quantity, direction: "OUT", reason: "sale" },
          });
        } else if (itemType === "LENS") {
          const lens = await tx.lens.findUnique({ where: { id: itemId } });
          if (!lens) throw new Error(`Lens not found: ${itemId}`);
          if (lens.stockQty < quantity) throw new Error(`Not enough lens stock for ${lens.sku}`);

          const unitPrice = it.unitPrice != null ? Number(it.unitPrice) : lens.sellPrice;
          const unitCost = lens.costPrice;

          subtotal += unitPrice * quantity;
          cogs += unitCost * quantity;

          preparedItems.push({ itemType, itemId, quantity, unitPrice, unitCost });

          await tx.lens.update({
            where: { id: itemId },
            data: { stockQty: lens.stockQty - quantity },
          });

          await tx.stockMovement.create({
            data: { itemType: "LENS", itemId, quantity, direction: "OUT", reason: "sale" },
          });
        } else {
          throw new Error(`Invalid itemType: ${itemType}`);
        }
      }

      const disc = Number(discount) || 0;
      const total = Math.max(subtotal - disc, 0);
      const profit = total - cogs;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo,
          customerId: Number(customerId),
          subtotal,
          discount: disc,
          total,
          cogs,
          profit,
          items: {
            create: preparedItems,
          },
        },
        include: { items: true },
      });

      // Payment (optional)
      if (payment && payment.amount) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: Number(payment.amount),
            method: String(payment.method || "CASH").toUpperCase(),
          },
        });
      }

      return invoice;
    });

    res.status(201).json({ message: "Invoice created ✅", invoice: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Error creating invoice" });
  }
};

exports.getAllInvoices = async (req, res) => {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { customer: true, items: true, payments: true },
  });
  res.json(invoices);
};

exports.getInvoice = async (req, res) => {
  const id = Number(req.params.id);
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { customer: true, items: true, payments: true },
  });
  if (!invoice) return res.status(404).json({ message: "Invoice not found" });
  res.json(invoice);
};

const PDFDocument = require("pdfkit");

exports.generateInvoicePDF = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        payments: true
      }
    });

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const doc = new PDFDocument({
      size: "A4",
      margin: 40
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename=${invoice.invoiceNo}.pdf`
    );

    doc.pipe(res);

    // 🔹 Shop Header
    doc.fontSize(20).text("KURUWITA OPTICAL", { align: "center" });
    doc.fontSize(10).text("Kuruwita, Sri Lanka", { align: "center" });
    doc.text("Phone: 077-XXXXXXX", { align: "center" });
    doc.moveDown();

    // 🔹 Invoice Info
    doc.fontSize(12);
    doc.text(`Invoice No: ${invoice.invoiceNo}`);
    doc.text(`Date: ${invoice.createdAt.toDateString()}`);
    doc.moveDown();

    // 🔹 Customer Info
    doc.text(`Customer: ${invoice.customer.name}`);
    doc.text(`Phone: ${invoice.customer.phone}`);
    doc.moveDown();

    // 🔹 Items Table
    doc.text("Items:");
    doc.moveDown(0.5);

    invoice.items.forEach((item) => {
      doc.text(
        `${item.itemType} x${item.quantity}  -  Rs.${item.unitPrice}  =  Rs.${item.unitPrice * item.quantity}`
      );
    });

    doc.moveDown();

    // 🔹 Totals
    doc.text(`Subtotal: Rs.${invoice.subtotal}`);
    doc.text(`Discount: Rs.${invoice.discount}`);
    doc.text(`Total: Rs.${invoice.total}`);
    doc.moveDown();

    const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = invoice.total - paid;

    doc.text(`Paid: Rs.${paid}`);
    doc.text(`Balance: Rs.${balance}`);
    doc.moveDown(2);

    // 🔹 Signature
    doc.text("________________________");
    doc.text("Authorized Signature");

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating PDF" });
  }
};

exports.getInvoice = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load invoice" });
  }
};

exports.addPayment = async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const { amount, method } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Amount must be > 0" });
    }

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    const payment = await prisma.payment.create({
      data: {
        invoiceId,
        amount: Number(amount),
        method: method || "CASH",
      },
    });

    res.json({ message: "Payment added ✅", payment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to add payment" });
  }
};