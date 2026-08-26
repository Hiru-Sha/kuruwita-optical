import { useEffect, useMemo, useState } from "react";
import api from "../api/axios";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [nic, setNic] = useState("");

  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setErr("");
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load customers");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const t =
        `${c.name || ""} ${c.phone || ""} ${c.nic || ""} ${c.address || ""}`.toLowerCase();
      return t.includes(q);
    });
  }, [customers, search]);

  const addCustomer = async () => {
    setErr("");
    setSuccess("");

    if (!name || !phone) {
      setErr("Name and Phone are required");
      return;
    }

    try {
      await api.post("/customers", { name, phone, address, nic });
      setName("");
      setPhone("");
      setAddress("");
      setNic("");
      setSuccess("Customer added ✅");
      load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add customer");
    }
  };

  return (
    <div>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-gray-500">
            Manage customer profiles and contact details
          </p>
        </div>
      </div>

      {err && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{err}</div>}
      {success && (
        <div className="bg-green-100 text-green-700 p-2 rounded mb-3">{success}</div>
      )}

      {/* Add Customer Form */}
      <div className="bg-white rounded-xl shadow p-4 mb-5">
        <div className="font-semibold mb-3">Add New Customer</div>

        <div className="grid grid-cols-4 gap-3">
          <input
            className="border p-2 rounded"
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Phone *"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="NIC (optional)"
            value={nic}
            onChange={(e) => setNic(e.target.value)}
          />
          <input
            className="border p-2 rounded"
            placeholder="Address (optional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={addCustomer}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            + Add Customer
          </button>
        </div>
      </div>

      {/* Search + Table */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Customer List</div>

          <input
            className="border p-2 rounded w-72"
            placeholder="Search by name / phone / NIC..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">NIC</th>
                <th className="p-3 text-left">Address</th>
                <th className="p-3 text-left">Created</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((c, idx) => (
                <tr
                  key={c.id}
                  className={`border-t hover:bg-blue-50 transition ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  }`}
                >
                  <td className="p-3 font-semibold text-gray-800">{c.name}</td>
                  <td className="p-3">{c.phone}</td>
                  <td className="p-3">{c.nic || "-"}</td>
                  <td className="p-3">{c.address || "-"}</td>
                  <td className="p-3 text-gray-500">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "-"}
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td className="p-4 text-gray-500" colSpan={5}>
                    No customers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}