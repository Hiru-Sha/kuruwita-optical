import { useLocation } from "react-router-dom";
import * as Auth from "../auth/AuthContext";

export default function Topbar() {
  const { pathname } = useLocation();

  // Support both patterns:
  // 1) useAuth() hook
  // 2) AuthContext + useContext
  const user = Auth.useAuth ? Auth.useAuth().user : undefined;
  const logout = Auth.useAuth ? Auth.useAuth().logout : undefined;

  const pageTitleMap = {
    "/": "Dashboard",
    "/customers": "Customers",
    "/frames": "Frames",
    "/lenses": "Lenses",
    "/invoices/new": "Create Invoice",
    "/invoices": "Invoices",
    "/reports": "Reports",
    "/suppliers": "Suppliers",
    "/purchases": "Purchases (GRN)",
  };

  const title = pageTitleMap[pathname] || "Kuruwita Optical";

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <div>
        <div className="text-lg font-semibold text-gray-800">{title}</div>
        <div className="text-xs text-gray-500">
          Manage your optical shop operations smoothly
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-800">
            {user?.name || "User"}
          </div>
          <div className="text-xs text-gray-500">{user?.role || ""}</div>
        </div>

        <button
          onClick={() => logout && logout()}
          className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}