import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (e) {
      setErr("Failed to load suppliers");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addSupplier = async () => {
    if (!name) return;
    try {
      await api.post("/suppliers", { name, phone });
      setName("");
      setPhone("");
      load();
    } catch {
      setErr("Failed to add supplier");
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Suppliers</h1>

      <div className="bg-white p-4 rounded shadow mb-4 flex gap-3">
        <input
          className="border p-2 rounded"
          placeholder="Supplier name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="bg-black text-white px-4 py-2 rounded" onClick={addSupplier}>
          Add
        </button>
      </div>

      <div className="bg-white rounded shadow p-4">
        {suppliers.length === 0 ? (
          <div>No suppliers yet</div>
        ) : (
          <ul>
            {suppliers.map((s) => (
              <li key={s.id}>
                {s.name} ({s.phone})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}