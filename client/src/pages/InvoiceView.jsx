import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { useParams, useNavigate } from "react-router-dom";

export default function InvoiceView() {
  const { id } = useParams();
  const nav = useNavigate();

  const [inv, setInv] = useState(null);
  const [err, setErr] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");

  const load = async () => {
    setErr("");
    try {
      const res = await api.get(`/invoices/${id}`);
      setInv(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load invoice");
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const paid = useMemo(() => {
    if (!inv) return 0;
    return (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
  }, [inv]);

  const balance = useMemo(() => {
    if (!inv) return 0;
    return Number(inv.total || 0) - paid;
  }, [inv, paid]);

  const openPDF = async () => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      alert("Failed to open PDF");
    }
  };

  const addPayment = async () => {
    if (!payAmount) return alert("Enter amount");
    try {
      await api.post(`/invoices/${id}/payments`, {
        amount: Number(payAmount),
        method: payMethod,
      });
      setPayAmount("");
      load();
    } catch (e) {
      alert(e?.response?.data?.message || "Payment failed");
    }
  };

  if (err) return <div className="bg-red-100 text-red-700 p-2 rounded">{err}</div>;
  if (!inv) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold">{inv.invoiceNo}</div>
          <div className="text-sm text-gray-600">{new Date(inv.createdAt).toLocaleString()}</div>
        </div>

        <div className="flex gap-2">
          <button className="px-4 py-2 bg-gray-700 text-white rounded" onClick={() => nav("/invoices")}>
            Back
          </button>
          <button className="px-4 py-2 bg-black text-white rounded" onClick={openPDF}>
            Open PDF
          </button>
        </div>
      </div>

      {/* Customer */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="font-semibold mb-2">Customer</div>
        <div>{inv.customer?.name}</div>
        <div className="text-sm text-gray-600">{inv.customer?.phone}</div>
        <div className="text-sm text-gray-600">{inv.customer?.address}</div>
      </div>

      {/* Items */}
      <div className="bg-white p-4 rounded shadow mb-4">
        <div className="font-semibold mb-2">Items</div>
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Qty</th>
              <th className="p-2 text-left">Unit Price</th>
              <th className="p-2 text-left">Total</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.itemType}</td>
                <td className="p-2">{it.quantity}</td>
                <td className="p-2">Rs.{it.unitPrice}</td>
                <td className="p-2">Rs.{it.unitPrice * it.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex justify-end">
          <div className="w-72 space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>Rs.{inv.subtotal}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>Rs.{inv.discount}</span></div>
            <div className="flex justify-between font-bold text-lg pt-1"><span>Total</span><span>Rs.{inv.total}</span></div>
            <div className="flex justify-between"><span>Paid</span><span>Rs.{paid}</span></div>
            <div className={`flex justify-between font-bold ${balance > 0 ? "text-red-600" : "text-green-700"}`}>
              <span>Balance</span><span>Rs.{balance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white p-4 rounded shadow">
        <div className="font-semibold mb-3">Payments</div>

        <div className="flex gap-2 mb-4">
          <input
            className="border p-2 rounded w-48"
            placeholder="Amount"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <select className="border p-2 rounded" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
            <option value="CASH">CASH</option>
            <option value="CARD">CARD</option>
            <option value="TRANSFER">TRANSFER</option>
          </select>
          <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={addPayment}>
            Add Payment
          </button>
        </div>

        {inv.payments.length === 0 ? (
          <div className="text-gray-500">No payments yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Method</th>
                <th className="p-2 text-left">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.payments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{new Date(p.createdAt).toLocaleString()}</td>
                  <td className="p-2">{p.method}</td>
                  <td className="p-2">Rs.{p.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}