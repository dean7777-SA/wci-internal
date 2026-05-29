import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";

const NAV_LINKS = [
  { to: "/", label: "Admin" },
  { to: "/sales", label: "Sales" },
  { to: "/projects", label: "Projects" },
  { to: "/installations", label: "Installations" },
];

export default function Dashboard() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">WCI Internal</span>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <Link key={to} to={to}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  to === "/" ? "bg-gray-900 text-white font-medium" : "text-gray-500 hover:bg-gray-100"
                }`}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{profile?.display_name ?? profile?.email}</span>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">Sign out</button>
        </div>
      </div>
      <AdminDashboard />
    </div>
  );
}
