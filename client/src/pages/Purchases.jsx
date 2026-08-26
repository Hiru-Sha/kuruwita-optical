import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Purchases() {
  const [suppliers, setSuppliers] = useState([]);
  const [frames, setFrames] = useState([]);
  const [lenses, setLenses] = useState([]);

  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState([]);

  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const load = async () => {
      const [s, f, l] = await Promise.all([
        api.get("/suppliers"),
        api.get("/frames"),
        api.get("/lenses"),
      ]);
      setSuppliers(s.data);
      setFrames(f.data);
      setLenses(l.data);
    };
    load();
  }, []);

  const addItem = (type) => {
    setItems([...items, { itemType: type, itemId: "", quantity: 1, unitCost: 0 }]);
  };

  const createPurchase = async () => {
    try {
      await api.post("/purchases", {
        supplierId: Number(supplierId),
        items: items.map((it) => ({
          itemType: it.itemType,
          itemId: Number(it.itemId),
          quantity: Number(it.quantity),
          unitCost: Number(it.unitCost),
        })),
      });

      setSuccess("Purchase created ✅");
      setItems([]);
    } catch {
      setErr("Failed to create purchase");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Create Purchase (GRN)</h1>

      {err && <div className="bg-red-100 p-2 rounded mb-2">{err}</div>}
      {success && <div className="bg-green-100 p-2 rounded mb-2">{success}</div>}

      <div className="bg-white p-4 rounded shadow mb-4">
        <select
          className="border p-2 rounded w-full"
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
        >
          <option value="">Select Supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3 mb-3">
        <button className="bg-black text-white px-3 py-2 rounded" onClick={() => addItem("FRAME")}>
          + Add Frame
        </button>
        <button className="bg-black text-white px-3 py-2 rounded" onClick={() => addItem("LENS")}>
          + Add Lens
        </button>
      </div>

      {items.map((it, i) => (
        <div key={i} className="bg-white p-3 rounded shadow mb-2 grid grid-cols-4 gap-2">
          <div>{it.itemType}</div>
          <input
            className="border p-2"
            placeholder="Item ID"
            onChange={(e) => {
              const copy = [...items];
              copy[i].itemId = e.target.value;
              setItems(copy);
            }}
          />
          <input
            className="border p-2"
            placeholder="Qty"
            onChange={(e) => {
              const copy = [...items];
              copy[i].quantity = e.target.value;
              setItems(copy);
            }}
          />
          <input
            className="border p-2"
            placeholder="Unit Cost"
            onChange={(e) => {
              const copy = [...items];
              copy[i].unitCost = e.target.value;
              setItems(copy);
            }}
          />
        </div>
      ))}

      {items.length > 0 && (
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={createPurchase}>
          Create Purchase
        </button>
      )}
    </div>
  );
}