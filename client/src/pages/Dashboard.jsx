import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/reports/summary");
        setSummary(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  if (!summary) return <div className="text-gray-500">Loading dashboard...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Business Overview</h1>

      <div className="grid grid-cols-4 gap-6">
        <Card
          title="Total Sales"
          value={`Rs. ${summary.totalSales}`}
          color="bg-blue-500"
        />
        <Card
          title="Total Profit"
          value={`Rs. ${summary.totalProfit}`}
          color="bg-green-500"
        />
        <Card
          title="Cost of Goods"
          value={`Rs. ${summary.totalCogs}`}
          color="bg-orange-500"
        />
        <Card
          title="Total Invoices"
          value={summary.invoiceCount}
          color="bg-purple-500"
        />
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 flex items-center justify-between hover:shadow-md transition">
      <div>
        <div className="text-gray-500 text-sm">{title}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </div>

      <div className={`w-10 h-10 rounded-lg ${color}`} />
    </div>
  );
}