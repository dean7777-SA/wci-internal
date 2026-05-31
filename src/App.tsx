import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { HashRedirect } from "@/components/HashRedirect";
import Login from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import SalesDashboard from "@/pages/SalesDashboard";
import { ProjectsDashboard } from "@/features/projects/ProjectsDashboard";
import { InstallationSchedule } from "@/features/installations/InstallationSchedule";

// Role constants
const ADMIN_ROLES = ["admin"] as const;
const SALES_ROLES = ["admin", "sales"] as const;
const ALL_ROLES = ["admin", "sales", "installer"] as const;

// Returns the home route for recognized wci-internal roles, or null for public 'user' role.
function roleHome(role: string | null | undefined): string | null {
  if (role === "admin") return "/";
  if (role === "sales") return "/sales";
  if (role === "installer") return "/installations";
  return null; // 'user' or unknown — no wci-internal access
}

function AccessDenied() {
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-red-500">Access denied. Contact an administrator.</p>
      <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900 underline">Sign out</button>
    </div>
  );
}

// Require user to be logged in with one of the allowed roles.
// Unauthorized roles are shown an access denied screen instead of redirected.
function RequireRole({ children, roles }: { children: React.ReactNode; roles: readonly string[] }) {
  const { user, loading, profile } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  const home = roleHome(profile?.role);
  if (!profile || !home) return <AccessDenied />; // no profile or unrecognized role (e.g. public 'user')
  if (!roles.includes(profile.role ?? "")) return <Navigate to={home} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading, profile } = useAuth();
  if (loading) return null;
  const home = roleHome(profile?.role);
  return (
    <>
      <HashRedirect />
      <Routes>
      <Route path="/login" element={user && home ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<RequireRole roles={ADMIN_ROLES}><Dashboard /></RequireRole>} />
      <Route path="/sales" element={<RequireRole roles={SALES_ROLES}><SalesDashboardShell /></RequireRole>} />
      <Route path="/projects" element={<RequireRole roles={SALES_ROLES}><ProjectsDashboardShell /></RequireRole>} />
      <Route path="/installations" element={<RequireRole roles={ALL_ROLES}><InstallationsShell /></RequireRole>} />
      <Route path="*" element={<Navigate to={home ?? "/"} replace />} />
    </Routes>
    </>
  );
}

const NAV_LINKS = [
  { to: "/", label: "Admin", roles: ADMIN_ROLES },
  { to: "/sales", label: "Sales", roles: SALES_ROLES },
  { to: "/projects", label: "Projects", roles: SALES_ROLES },
  { to: "/installations", label: "Installations", roles: ALL_ROLES },
] as const;

function TopNav() {
  const { pathname } = useLocation();
  const { profile, signOut } = useAuth();
  const role = profile?.role ?? "";
  const links = NAV_LINKS.filter(l => (l.roles as readonly string[]).includes(role));
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <img src="/wci-logo.png" alt="WCI" className="h-[28px] w-auto" />
        <nav className="flex items-center gap-1">
          {links.map(({ to, label }) => (
            <Link key={to} to={to}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                pathname === to ? "bg-gray-900 text-white font-medium" : "text-gray-500 hover:bg-gray-100"
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
  );
}

function SalesDashboardShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <SalesDashboard />
    </div>
  );
}

function ProjectsDashboardShell() {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-lg font-semibold text-gray-900 mb-6">Projects</h1>
        <ProjectsDashboard />
      </div>
    </div>
  );
}

function InstallationsShell() {
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      <TopNav />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col p-6 max-w-7xl mx-auto w-full">
        <h1 className="text-lg font-semibold text-gray-900 mb-6 shrink-0">Installation Schedule</h1>
        <InstallationSchedule />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
