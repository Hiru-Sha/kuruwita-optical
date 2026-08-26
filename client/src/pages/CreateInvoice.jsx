import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

export default function CreateInvoice() {
  const [customers, setCustomers] = useState([]);
  const [frames, setFrames] = useState([]);
  const [lenses, setLenses] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("");

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [items, setItems] = useState([]);
  // { itemType, itemId, quantity, unitPrice, label }

  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState(null);

  const load = async () => {
    const [c, f, l] = await Promise.all([
      api.get("/customers"),
      api.get("/frames"),
      api.get("/lenses"),
    ]);
    setCustomers(c.data);
    setFrames(f.data);
    setLenses(l.data);
  };

  useEffect(() => {
    load();
  }, []);

  const addItem = (itemType) => {
    setItems((prev) => [
      ...prev,
      {
        itemType,
        itemId: "",
        quantity: 1,
        unitPrice: 0,
        label: "",
      },
    ]);
  };

  const optionsFor = (type) => (type === "FRAME" ? frames : lenses);

  const onSelectItem = (index, itemId) => {
    const type = items[index].itemType;
    const list = optionsFor(type);
    const found = list.find((x) => String(x.id) === String(itemId));

    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              itemId,
              unitPrice: found ? Number(found.sellPrice) : 0,
              label: found
                ? `${found.sku} - ${
                    type === "FRAME"
                      ? found.brand + " " + found.model
                      : found.type + " " + found.index
                  }`
                : "",
            }
          : it
      )
    );
  };

  const updateItem = (index, patch) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    );
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, it) =>
        sum + Number(it.unitPrice || 0) * Number(it.quantity || 0),
      0
    );
  }, [items]);

  const total = useMemo(() => {
    const d = Number(discount || 0);
    return Math.max(subtotal - d, 0);
  }, [subtotal, discount]);

  const createInvoice = async () => {
    setErr("");
    setSuccess("");
    setCreatedInvoice(null);

    if (!customerId) return setErr("Select a customer");
    if (items.length === 0) return setErr("Add at least one item");

    for (const it of items) {
      if (!it.itemId) return setErr("Select product for all items");
      if (Number(it.quantity) <= 0) return setErr("Quantity must be > 0");
    }

    try {
      const payload = {
        customerId: Number(customerId),
        discount: Number(discount || 0),
        items: items.map((it) => ({
          itemType: it.itemType,
          itemId: Number(it.itemId),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
        payment: paymentAmount
          ? { amount: Number(paymentAmount), method: paymentMethod }
          : undefined,
      };

      const res = await api.post("/invoices", payload);
      setCreatedInvoice(res.data.invoice);
      setSuccess("Invoice created ✅");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create invoice");
    }
  };

  const openPDF = async () => {
    if (!createdInvoice?.id) return;

    try {
      const res = await api.get(`/invoices/${createdInvoice.id}/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (e) {
      alert("Failed to open PDF");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Create Invoice</h1>

      {err && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{err}</div>
      )}
      {success && (
        <div className="bg-green-100 text-green-700 p-2 rounded mb-3">
          {success}
        </div>
      )}

      <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm">Customer</label>
          <select
            className="border p-2 rounded w-full"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">-- Select --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm">Discount (Rs.)</label>
          <input
            className="border p-2 rounded w-full"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Payment Amount (Rs.)</label>
          <input
            className="border p-2 rounded w-full"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Payment Method</label>
          <select
            className="border p-2 rounded w-full"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="CASH">CASH</option>
            <option value="CARD">CARD</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={() => addItem("FRAME")}
        >
          + Add Frame
        </button>
        <button
          className="bg-black text-white px-4 py-2 rounded"
          onClick={() => addItem("LENS")}
        >
          + Add Lens
        </button>
      </div>

      <div className="bg-white rounded shadow p-4">
        <h2 className="font-semibold mb-3">Items</h2>

        {items.length === 0 && <div className="text-gray-500">No items added</div>}

        <div className="flex flex-col gap-3">
          {items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-2 font-semibold">{it.itemType}</div>

              <div className="col-span-5">
                <select
                  className="border p-2 rounded w-full"
                  value={it.itemId}
                  onChange={(e) => onSelectItem(idx, e.target.value)}
                >
                  <option value="">-- Select --</option>
                  {optionsFor(it.itemType).map((p) => (
                    <option key={p.id} value={p.id}>
                      {it.itemType === "FRAME"
                        ? `${p.sku} - ${p.brand} ${p.model}`
                        : `${p.sku} - ${p.type} ${p.index}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <input
                  className="border p-2 rounded w-full"
                  type="number"
                  min="1"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <input
                  className="border p-2 rounded w-full"
                  value={it.unitPrice}
                  onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                />
              </div>

              <div className="col-span-1">
                <button
                  className="bg-red-600 text-white px-3 py-2 rounded"
                  onClick={() => removeItem(idx)}
                >
                  X
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-4 flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>Rs.{subtotal}</span>
            </div>

            <div className="flex justify-between">
              <span>Discount</span>
              <span>Rs.{Number(discount || 0)}</span>
            </div>

            <div className="flex justify-between font-bold text-lg pt-1">
              <span>Total</span>
              <span>Rs.{total}</span>
            </div>

            <button
              className="w-full bg-green-600 text-white py-2 rounded mt-3"
              onClick={createInvoice}
            >
              Create Invoice
            </button>

            {createdInvoice && (
              <button
                className="w-full bg-black text-white py-2 rounded"
                onClick={openPDF}
              >
                Open PDF (Invoice)
              </button>
            )}
          </div>
        </div>
      </div>

      {createdInvoice && (
        <div className="mt-4 bg-white p-4 rounded shadow">
          <div className="font-semibold">Created ✅</div>
          <div>Invoice No: {createdInvoice.invoiceNo}</div>
          <div>Total: Rs.{createdInvoice.total}</div>
        </div>
      )}
    </div>
  );
}