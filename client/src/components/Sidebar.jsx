import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { pathname } = useLocation();

  const linkStyle = (path) =>
    `px-3 py-2 rounded-lg text-sm transition ${
      pathname === path
        ? "bg-blue-600 text-white shadow"
        : "text-gray-700 hover:bg-blue-50"
    }`;

  return (
    <div className="w-64 bg-white border-r min-h-screen flex flex-col">

      {/* Brand */}
      <div className="p-5 border-b">
        <h1 className="text-xl font-bold text-blue-700">
          Kuruwita Optical
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Shop Management System
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4 flex-1">

        <Link to="/" className={linkStyle("/")}>
          Dashboard
        </Link>

        <Link to="/customers" className={linkStyle("/customers")}>
          Customers
        </Link>

        <Link to="/frames" className={linkStyle("/frames")}>
          Frames
        </Link>

        <Link to="/lenses" className={linkStyle("/lenses")}>
          Lenses
        </Link>

        <Link to="/invoices/new" className={linkStyle("/invoices/new")}>
          Create Invoice
        </Link>

        <Link to="/invoices" className={linkStyle("/invoices")}>
          Invoices
        </Link>

        <Link to="/reports" className={linkStyle("/reports")}>
          Reports
        </Link>

        <Link to="/suppliers" className={linkStyle("/suppliers")}>
          Suppliers
        </Link>

        <Link to="/purchases" className={linkStyle("/purchases")}>
          Purchases (GRN)
        </Link>

      </nav>

      {/* Footer */}
      <div className="p-4 text-xs text-gray-400 border-t">
        © {new Date().getFullYear()} Kuruwita Optical
      </div>

    </div>
  );
}