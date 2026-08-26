import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import { Link } from "react-router-dom";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [err, setErr] = useState("");

  const fetchInvoices = async () => {
    setErr("");
    try {
      const qs = [];
      if (search) qs.push(`search=${encodeURIComponent(search)}`);
      if (from) qs.push(`from=${from}`);
      if (to) qs.push(`to=${to}`);
      const query = qs.length ? `?${qs.join("&")}` : "";
      const res = await api.get(`/invoices${query}`);
      setInvoices(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load invoices");
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const rows = useMemo(() => {
    return invoices.map((inv) => {
      const paid = (inv.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const balance = Number(inv.total || 0) - paid;
      return { ...inv, paid, balance };
    });
  }, [invoices]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Invoices</h1>

      {err && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{err}</div>}

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-sm">Search (Invoice / Name / Phone)</label>
          <input
            className="border p-2 rounded w-72"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="INV-... / Nimal / 077..."
          />
        </div>

        <div>
          <label className="text-sm">From</label>
          <input className="border p-2 rounded" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">To</label>
          <input className="border p-2 rounded" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <button className="bg-black text-white px-4 py-2 rounded" onClick={fetchInvoices}>
          Apply
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Invoice</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Total</th>
              <th className="p-2 text-left">Paid</th>
              <th className="p-2 text-left">Balance</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-2 font-semibold">{inv.invoiceNo}</td>
                <td className="p-2">{new Date(inv.createdAt).toLocaleString()}</td>
                <td className="p-2">
                  {inv.customer?.name} <div className="text-xs text-gray-500">{inv.customer?.phone}</div>
                </td>
                <td className="p-2">Rs.{inv.total}</td>
                <td className="p-2">Rs.{inv.paid}</td>
                <td className={`p-2 font-semibold ${inv.balance > 0 ? "text-red-600" : "text-green-700"}`}>
                  Rs.{inv.balance}
                </td>
                <td className="p-2">
                  <Link to={`/invoices/${inv.id}`} className="px-3 py-1 bg-blue-600 text-white rounded">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-4 text-gray-500" colSpan={7}>
                  No invoices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}