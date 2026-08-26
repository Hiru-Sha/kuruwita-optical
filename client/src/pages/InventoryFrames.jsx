import { useEffect, useState } from "react";
import api from "../api/axios";

export default function InventoryFrames() {
  const [frames, setFrames] = useState([]);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    sku: "",
    brand: "",
    model: "",
    color: "",
    size: "",
    costPrice: "",
    sellPrice: "",
    stockQty: "",
    reorderLevel: ""
  });

  const fetchFrames = async () => {
    const res = await api.get("/frames");
    setFrames(res.data);
  };

  useEffect(() => {
    fetchFrames();
  }, []);

  const createFrame = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/frames", {
        ...form,
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        stockQty: Number(form.stockQty || 0),
        reorderLevel: Number(form.reorderLevel || 5),
      });
      setForm({
        sku: "",
        brand: "",
        model: "",
        color: "",
        size: "",
        costPrice: "",
        sellPrice: "",
        stockQty: "",
        reorderLevel: ""
      });
      fetchFrames();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create frame (Admin only?)");
    }
  };

  const adjustStock = async (id, direction) => {
    const qty = prompt(`Enter quantity to ${direction}:`);
    if (!qty) return;

    try {
      await api.patch(`/frames/${id}/stock`, {
        quantity: Number(qty),
        direction,
        reason: "ui adjustment"
      });
      fetchFrames();
    } catch (e) {
      alert(e?.response?.data?.message || "Stock update failed");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Frames Inventory</h1>

      {err && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{err}</div>}

      {/* Add Frame Form */}
      <form onSubmit={createFrame} className="bg-white p-4 rounded shadow mb-6 grid grid-cols-2 gap-3">
        <input className="border p-2 rounded" placeholder="SKU" value={form.sku} onChange={(e)=>setForm({...form, sku:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Brand" value={form.brand} onChange={(e)=>setForm({...form, brand:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Model" value={form.model} onChange={(e)=>setForm({...form, model:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Color" value={form.color} onChange={(e)=>setForm({...form, color:e.target.value})} />
        <input className="border p-2 rounded" placeholder="Size" value={form.size} onChange={(e)=>setForm({...form, size:e.target.value})} />
        <input className="border p-2 rounded" placeholder="Cost Price" value={form.costPrice} onChange={(e)=>setForm({...form, costPrice:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Sell Price" value={form.sellPrice} onChange={(e)=>setForm({...form, sellPrice:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Initial Stock" value={form.stockQty} onChange={(e)=>setForm({...form, stockQty:e.target.value})} />
        <input className="border p-2 rounded" placeholder="Reorder Level" value={form.reorderLevel} onChange={(e)=>setForm({...form, reorderLevel:e.target.value})} />
        <button className="col-span-2 bg-black text-white py-2 rounded">Add Frame</button>
      </form>

      {/* Frames Table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Brand</th>
              <th className="p-2 text-left">Model</th>
              <th className="p-2 text-left">Stock</th>
              <th className="p-2 text-left">Sell</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {frames.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="p-2">{f.sku}</td>
                <td className="p-2">{f.brand}</td>
                <td className="p-2">{f.model}</td>
                <td className="p-2">{f.stockQty}</td>
                <td className="p-2">Rs.{f.sellPrice}</td>
                <td className="p-2 flex gap-2">
                  <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => adjustStock(f.id, "IN")}>
                    +IN
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => adjustStock(f.id, "OUT")}>
                    -OUT
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}