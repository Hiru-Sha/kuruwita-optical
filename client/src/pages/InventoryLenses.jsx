import { useEffect, useState } from "react";
import api from "../api/axios";

export default function InventoryLenses() {
  const [lenses, setLenses] = useState([]);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    sku: "",
    type: "",
    index: "",
    coating: "",
    costPrice: "",
    sellPrice: "",
    stockQty: "",
    reorderLevel: ""
  });

  const fetchLenses = async () => {
    const res = await api.get("/lenses");
    setLenses(res.data);
  };

  useEffect(() => {
    fetchLenses();
  }, []);

  const createLens = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/lenses", {
        ...form,
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        stockQty: Number(form.stockQty || 0),
        reorderLevel: Number(form.reorderLevel || 5),
      });

      setForm({
        sku: "",
        type: "",
        index: "",
        coating: "",
        costPrice: "",
        sellPrice: "",
        stockQty: "",
        reorderLevel: ""
      });

      fetchLenses();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create lens");
    }
  };

  const adjustStock = async (id, direction) => {
    const qty = prompt(`Enter quantity to ${direction}:`);
    if (!qty) return;

    try {
      await api.patch(`/lenses/${id}/stock`, {
        quantity: Number(qty),
        direction,
        reason: "ui adjustment"
      });
      fetchLenses();
    } catch (e) {
      alert(e?.response?.data?.message || "Stock update failed");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Lenses Inventory</h1>

      {err && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{err}</div>}

      <form onSubmit={createLens} className="bg-white p-4 rounded shadow mb-6 grid grid-cols-2 gap-3">
        <input className="border p-2 rounded" placeholder="SKU" value={form.sku} onChange={(e)=>setForm({...form, sku:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Type (Single/Progressive)" value={form.type} onChange={(e)=>setForm({...form, type:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Index (1.56 / 1.67)" value={form.index} onChange={(e)=>setForm({...form, index:e.target.value})} />
        <input className="border p-2 rounded" placeholder="Coating (AR / Blue Cut)" value={form.coating} onChange={(e)=>setForm({...form, coating:e.target.value})} />
        <input className="border p-2 rounded" placeholder="Cost Price" value={form.costPrice} onChange={(e)=>setForm({...form, costPrice:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Sell Price" value={form.sellPrice} onChange={(e)=>setForm({...form, sellPrice:e.target.value})} required />
        <input className="border p-2 rounded" placeholder="Initial Stock" value={form.stockQty} onChange={(e)=>setForm({...form, stockQty:e.target.value})} />
        <input className="border p-2 rounded" placeholder="Reorder Level" value={form.reorderLevel} onChange={(e)=>setForm({...form, reorderLevel:e.target.value})} />
        <button className="col-span-2 bg-black text-white py-2 rounded">Add Lens</button>
      </form>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Index</th>
              <th className="p-2 text-left">Stock</th>
              <th className="p-2 text-left">Sell</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {lenses.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.sku}</td>
                <td className="p-2">{l.type}</td>
                <td className="p-2">{l.index}</td>
                <td className="p-2">{l.stockQty}</td>
                <td className="p-2">Rs.{l.sellPrice}</td>
                <td className="p-2 flex gap-2">
                  <button className="px-3 py-1 bg-green-600 text-white rounded" onClick={() => adjustStock(l.id, "IN")}>
                    +IN
                  </button>
                  <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={() => adjustStock(l.id, "OUT")}>
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