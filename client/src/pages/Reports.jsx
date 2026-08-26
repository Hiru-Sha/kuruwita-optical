import { useEffect, useState } from "react";
import api from "../api/axios";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

export default function Reports() {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");

    const [summary, setSummary] = useState(null);
    const [daily, setDaily] = useState([]);
    const [lowStock, setLowStock] = useState({ frames: [], lenses: [] });
    const [err, setErr] = useState("");

    const load = async () => {
        setErr("");
        try {
            const qs = [];
            if (from) qs.push(`from=${from}`);
            if (to) qs.push(`to=${to}`);
            const query = qs.length ? `?${qs.join("&")}` : "";

            const [s, d, l] = await Promise.all([
                api.get(`/reports/summary${query}`),
                api.get(`/reports/daily${query}`),
                api.get("/reports/low-stock"),
            ]);

            setSummary(s.data);
            setDaily(d.data);
            setLowStock(l.data);
        } catch (e) {
            setErr(e?.response?.data?.message || "Failed to load reports (Admin only?)");
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Reports</h1>

            {err && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{err}</div>}

            <div className="bg-white p-4 rounded shadow mb-4 flex gap-3 items-end">
                <div>
                    <label className="text-sm">From</label>
                    <input className="border p-2 rounded w-full" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm">To</label>
                    <input className="border p-2 rounded w-full" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                </div>
                <button className="bg-black text-white px-4 py-2 rounded" onClick={load}>
                    Apply
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded shadow">
                        <div className="text-sm text-gray-500">Invoices</div>
                        <div className="text-2xl font-bold">{summary.invoiceCount}</div>
                    </div>

                    <div className="bg-white p-4 rounded shadow">
                        <div className="text-sm text-gray-500">Sales</div>
                        <div className="text-2xl font-bold">Rs.{summary.totalSales}</div>
                    </div>

                    <div className="bg-white p-4 rounded shadow">
                        <div className="text-sm text-gray-500">COGS</div>
                        <div className="text-2xl font-bold">Rs.{summary.totalCogs}</div>
                    </div>

                    <div className="bg-white p-4 rounded shadow">
                        <div className="text-sm text-gray-500">Profit</div>
                        <div className="text-2xl font-bold">Rs.{summary.totalProfit}</div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded shadow p-4 mb-6">
                <h2 className="font-semibold mb-3">Sales & Profit Trend</h2>

                {daily.length === 0 ? (
                    <div className="text-gray-500">No data to chart</div>
                ) : (
                    <div style={{ width: "100%", height: 280 }}>
                        <ResponsiveContainer>
                            <LineChart data={daily}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="sales" />
                                <Line type="monotone" dataKey="profit" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>


            {/* Daily Table */}
            <div className="bg-white rounded shadow p-4 mb-6">
                <h2 className="font-semibold mb-3">Daily Sales</h2>
                {daily.length === 0 ? (
                    <div className="text-gray-500">No invoices in selected range</div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 text-left">Date</th>
                                <th className="p-2 text-left">Invoices</th>
                                <th className="p-2 text-left">Sales</th>
                                <th className="p-2 text-left">Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {daily.map((r) => (
                                <tr key={r.date} className="border-t">
                                    <td className="p-2">{r.date}</td>
                                    <td className="p-2">{r.count}</td>
                                    <td className="p-2">Rs.{r.sales}</td>
                                    <td className="p-2">Rs.{r.profit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Low Stock */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded shadow p-4">
                    <h2 className="font-semibold mb-3">Low Stock Frames</h2>
                    {lowStock.frames.length === 0 ? (
                        <div className="text-gray-500">No low stock frames ✅</div>
                    ) : (
                        <ul className="list-disc pl-5">
                            {lowStock.frames.map((f) => (
                                <li key={f.id}>
                                    {f.sku} ({f.brand} {f.model}) — Stock: {f.stockQty} / Reorder: {f.reorderLevel}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="bg-white rounded shadow p-4">
                    <h2 className="font-semibold mb-3">Low Stock Lenses</h2>
                    {lowStock.lenses.length === 0 ? (
                        <div className="text-gray-500">No low stock lenses ✅</div>
                    ) : (
                        <ul className="list-disc pl-5">
                            {lowStock.lenses.map((l) => (
                                <li key={l.id}>
                                    {l.sku} ({l.type} {l.index}) — Stock: {l.stockQty} / Reorder: {l.reorderLevel}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}