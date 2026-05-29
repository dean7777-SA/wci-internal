import { useState, useMemo } from "react";
import {
  Search, ChevronDown, Shield, Users, BarChart3,
  UserCircle, UserPlus, X, Loader2, Trash2,
} from "lucide-react";
import {
  useAllProfiles, useUpdateUserRole, useUpdateWhatsApp, useContactSubmissions,
  useEstimateRequests, type UserProfile, type UserRole,
} from "@/hooks/useAdmin";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

/* ─── Config ─── */
const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: "user",      label: "User",      color: "bg-slate-100 text-slate-600" },
  { value: "sales",     label: "Sales",     color: "bg-indigo-100 text-indigo-700" },
  { value: "admin",     label: "Admin",     color: "bg-amber-100 text-amber-700" },
  { value: "installer", label: "Installer", color: "bg-emerald-100 text-emerald-700" },
];
const roleBadge = (role: string | null) =>
  ROLES.find((r) => r.value === role)?.color ?? "bg-gray-100 text-gray-500";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

type TabId = "users" | "overview";

/* ═══════════════════════════════════════════════ */
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("users");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Admin Dashboard</h1>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1">
          {([
            { id: "users" as TabId, label: "User Management", icon: Users },
            { id: "overview" as TabId, label: "Overview", icon: BarChart3 },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {activeTab === "users" ? <UserManagement /> : <OverviewPanel />}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   USER MANAGEMENT
   ═══════════════════════════════════════════════ */
function UserManagement() {
  const { data: profiles = [], isLoading } = useAllProfiles();
  const updateRole = useUpdateUserRole();
  const updateWhatsApp = useUpdateWhatsApp();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingWhatsApp, setEditingWhatsApp] = useState<Record<string, string>>({});
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("sales");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return profiles.filter((p) => {
      if (roleFilter !== "all" && (p.role ?? "user") !== roleFilter) return false;
      if (q && ![p.display_name, p.company, p.phone, p.email, p.user_id].some((f) => f?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [profiles, search, roleFilter]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: profiles.length };
    for (const p of profiles) {
      const r = p.role ?? "user";
      counts[r] = (counts[r] ?? 0) + 1;
    }
    return counts;
  }, [profiles]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteLoading(true);
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: { email: inviteEmail, full_name: inviteName, role: inviteRole },
    });
    setInviteLoading(false);
    if (error || data?.error) {
      setInviteError(error?.message || data?.error || "Failed to invite user");
    } else {
      setInviteSuccess(`Invite sent to ${inviteEmail}.`);
      qc.invalidateQueries({ queryKey: ["admin", "profiles"] });
    }
  }

  async function handleDelete(p: UserProfile) {
    setDeletingId(p.id);
    const { data, error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: p.user_id },
    });
    setDeletingId(null);
    if (!error && !data?.error) {
      setConfirmDeleteId(null);
      setExpandedId(null);
      qc.invalidateQueries({ queryKey: ["admin", "profiles"] });
    }
  }

  if (isLoading) return <Skeleton />;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={profiles.length} />
        <StatCard label="Admins" value={roleCounts["admin"] ?? 0} />
        <StatCard label="Sales" value={roleCounts["sales"] ?? 0} />
        <StatCard label="Installers" value={roleCounts["installer"] ?? 0} />
        <StatCard label="Users" value={roleCounts["user"] ?? 0} />
      </div>

      {/* Invite */}
      {!showInvite ? (
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-gray-700">Invite New User</p>
            <button onClick={() => { setShowInvite(false); setInviteSuccess(""); setInviteError(""); }}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-700" />
            </button>
          </div>
          {inviteSuccess ? (
            <div className="space-y-3">
              <p className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-lg">{inviteSuccess}</p>
              <button
                onClick={() => { setInviteSuccess(""); setInviteEmail(""); setInviteName(""); }}
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Invite another
              </button>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email *</label>
                <input type="email" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                <input type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as UserRole)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300">
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={inviteLoading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50">
                {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Send Invite
              </button>
              {inviteError && <p className="col-span-4 text-sm text-red-600">{inviteError}</p>}
            </form>
          )}
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, email, company…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
        <div className="relative">
          <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
            <option value="all">All Roles ({roleCounts["all"]})</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label} ({roleCounts[r.value] ?? 0})</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* User list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No users found</p>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_1fr_90px_100px_40px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <span>Name</span><span>Email</span><span>Company</span>
            <span>Role</span><span>Joined</span><span />
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const open = expandedId === p.id;
              const currentRole = (p.role ?? "user") as UserRole;
              return (
                <div key={p.id}>
                  <button
                    onClick={() => setExpandedId(open ? null : p.id)}
                    className="w-full grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1fr_90px_100px_40px] gap-2 md:gap-4 items-center px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-gray-900 truncate">
                      <UserCircle className="w-4 h-4 text-gray-400 shrink-0" />
                      {p.display_name || "Unnamed"}
                    </span>
                    <span className="text-sm text-gray-500 truncate hidden md:block">{p.email || "—"}</span>
                    <span className="text-sm text-gray-500 truncate hidden md:block">{p.company || "—"}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full w-fit font-medium ${roleBadge(currentRole)}`}>{currentRole}</span>
                    <span className="text-xs text-gray-400 hidden md:block">{fmtDate(p.created_at)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 hidden md:block transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                  </button>

                  {open && (
                    <ExpandedRow
                      p={p}
                      currentRole={currentRole}
                      confirmDeleteId={confirmDeleteId}
                      deletingId={deletingId}
                      editingWhatsApp={editingWhatsApp}
                      onRoleChange={(role) => updateRole.mutate({ id: p.id, role })}
                      onWhatsAppChange={(val) => setEditingWhatsApp(prev => ({ ...prev, [p.id]: val }))}
                      onWhatsAppSave={() => {
                        const val = editingWhatsApp[p.id] ?? p.whatsapp_phone ?? "";
                        updateWhatsApp.mutate(
                          { id: p.id, whatsapp_phone: val },
                          {
                            onSuccess: () => toast({ title: "WhatsApp number saved" }),
                            onError: () => toast({ title: "Failed to save", variant: "destructive" }),
                          }
                        );
                      }}
                      onDeleteRequest={() => setConfirmDeleteId(p.id)}
                      onDeleteConfirm={() => handleDelete(p)}
                      onDeleteCancel={() => setConfirmDeleteId(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Expanded row panel ─── */
function ExpandedRow({
  p, currentRole, confirmDeleteId, deletingId, editingWhatsApp,
  onRoleChange, onWhatsAppChange, onWhatsAppSave,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: {
  p: UserProfile;
  currentRole: UserRole;
  confirmDeleteId: string | null;
  deletingId: string | null;
  editingWhatsApp: Record<string, string>;
  onRoleChange: (role: UserRole) => void;
  onWhatsAppChange: (val: string) => void;
  onWhatsAppSave: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  return (
    <div className="px-5 pb-5 pt-3 bg-gray-50 border-t border-gray-100">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Profile</p>
          <DetailRow label="Name" value={p.display_name} />
          <DetailRow label="Email" value={p.email} />
          <DetailRow label="Phone" value={p.phone} />
          <DetailRow label="Company" value={p.company} />
          <DetailRow label="Location" value={p.location} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Account</p>
          <DetailRow label="User ID" value={p.user_id} />
          <DetailRow label="Joined" value={fmtDate(p.created_at)} />
          <DetailRow label="Updated" value={fmtDate(p.updated_at)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Role:</span>
          <div className="flex gap-1.5">
            {ROLES.map(r => (
              <button key={r.value} onClick={() => onRoleChange(r.value)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${currentRole === r.value ? r.color : "bg-gray-100 text-gray-400 hover:text-gray-700"}`}
              >{r.label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-400">WhatsApp:</span>
          <input type="tel" placeholder="+27821234567"
            value={editingWhatsApp[p.id] ?? (p.whatsapp_phone || "")}
            onChange={(e) => onWhatsAppChange(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button onClick={onWhatsAppSave}
            className="text-xs px-3 py-1 bg-gray-900 text-white rounded-full hover:bg-gray-700 transition-colors"
          >Save</button>
        </div>
        {confirmDeleteId === p.id ? (
          <DeleteConfirm
            loading={deletingId === p.id}
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
          />
        ) : (
          <button onClick={onDeleteRequest}
            className="text-xs px-3 py-1 bg-gray-100 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full flex items-center gap-1 transition-colors">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

function DeleteConfirm({ loading, onConfirm, onCancel }: { loading: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <span className="text-xs text-red-600">Delete this user?</span>
      <button onClick={onConfirm} disabled={loading}
        className="text-xs px-3 py-1 bg-red-600 text-white rounded-full hover:bg-red-700 flex items-center gap-1 disabled:opacity-50">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Confirm
      </button>
      <button onClick={onCancel}
        className="text-xs px-3 py-1 bg-gray-100 text-gray-500 rounded-full hover:text-gray-900">
        Cancel
      </button>
    </>
  );
}

/* ═══════════════════════════════════════════════
   OVERVIEW PANEL
   ═══════════════════════════════════════════════ */
function OverviewPanel() {
  const { data: contacts = [], isLoading: cl } = useContactSubmissions();
  const { data: estimates = [], isLoading: el } = useEstimateRequests();
  const { data: profiles = [], isLoading: pl } = useAllProfiles();

  if (cl || el || pl) return <Skeleton />;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return (
    <div className="space-y-8">
      <Section label="Platform Summary">
        <StatCard label="Total Users" value={profiles.length} />
        <StatCard label="Total Enquiries" value={contacts.length} />
        <StatCard label="Total Estimates" value={estimates.length} />
        <StatCard label="New This Week" value={
          contacts.filter(c => new Date(c.created_at) >= weekAgo).length +
          estimates.filter(e => new Date(e.created_at) >= weekAgo).length
        } />
      </Section>

      <Section label="Enquiries by Status">
        {["new","read","in-progress","quoted-sampled","completed","archived"].map(s => (
          <StatCard key={s} label={s} value={contacts.filter(c => c.status === s).length} />
        ))}
      </Section>

      <Section label="Enquiries by Type">
        {["project","bespoke","general","trade"].map(t => (
          <StatCard key={t} label={t} value={contacts.filter(c => c.form_type === t).length} />
        ))}
      </Section>

      <Section label="Estimates by Status">
        {["new","read","in-progress","quoted-sampled","completed","archived"].map(s => (
          <StatCard key={s} label={s} value={estimates.filter(e => e.status === s).length} />
        ))}
      </Section>
    </div>
  );
}

/* ─── Shared UI ─── */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{label}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>
    </div>
  );
}

function StatCard({ label, value, color = "bg-white border-gray-200" }: { label: string; value: number; color?: string }) {
  return (
    <div className={`border rounded-lg p-4 ${color}`}>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1 capitalize">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 min-w-[80px]">{label}</span>
      <span className="text-gray-700">{value || "—"}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />)}
    </div>
  );
}
