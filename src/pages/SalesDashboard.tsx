import { useState, useMemo } from "react";
import {
  Search, Filter, ChevronDown, ExternalLink, Paperclip,
  Package, Ruler, UserCircle, BarChart3, Loader2, Download,
  Mail, CheckCircle2, XCircle, Send,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import {
  useContactSubmissions, useEstimateRequests,
  useUpdateContactStatus, useUpdateEstimateStatus,
  useAssignContact, useAssignEstimate,
  type ContactSubmission, type EstimateRequest,
} from "@/hooks/useSales";
import { exportContactPdf, exportEstimatePdf } from "@/lib/exportEnquiryPdf";
import { withPdfSpinner } from "@/lib/pdfSpinner";

/* ─── Config ─── */
const CONTACT_STATUSES = ["new", "read", "in-progress", "quoted-sampled", "completed", "archived"] as const;
const ESTIMATE_STATUSES = ["new", "read", "in-progress", "quoted-sampled", "completed", "archived"] as const;

const STATUS_LABELS: Record<string, string> = {
  new: "New", read: "Read", "in-progress": "In Progress",
  "quoted-sampled": "Quoted / Sampled", completed: "Completed", archived: "Archived",
};
const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    new: "bg-amber-100 text-amber-700",
    read: "bg-slate-100 text-slate-600",
    "in-progress": "bg-sky-100 text-sky-700",
    "quoted-sampled": "bg-violet-100 text-violet-700",
    completed: "bg-emerald-100 text-emerald-700",
    archived: "bg-neutral-100 text-neutral-400",
  };
  return map[status] ?? "bg-gray-100 text-gray-500";
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });

const TEAM_MEMBERS = ["Felicity", "Amelia", "Alana", "Michael", "Lorraine", "Dean"] as const;

type TabId = "overview" | "project" | "bespoke" | "general" | "trade" | "estimates" | "email-test";

const TABS: { id: TabId; label: string; formType?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "project", label: "Project Consultation", formType: "project" },
  { id: "bespoke", label: "Bespoke Design", formType: "bespoke" },
  { id: "general", label: "General Enquiries", formType: "general" },
  { id: "trade", label: "Trade / Designers", formType: "trade" },
  { id: "estimates", label: "Estimates" },
  { id: "email-test", label: "Email Test" },
];

/* ═══════════════════════════════════════════════ */
export default function SalesDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const { data: contacts = [], isLoading: contactsLoading } = useContactSubmissions();
  const { data: estimates = [], isLoading: estimatesLoading } = useEstimateRequests();

  const newCounts: Record<TabId, number> = {
    overview: 0,
    project: contacts.filter((c) => c.form_type === "project" && c.status === "new").length,
    bespoke: contacts.filter((c) => c.form_type === "bespoke" && c.status === "new").length,
    general: contacts.filter((c) => c.form_type === "general" && c.status === "new").length,
    trade: contacts.filter((c) => c.form_type === "trade" && c.status === "new").length,
    estimates: estimates.filter((e) => e.status === "new").length,
    "email-test": 0,
  };

  const isOverview = activeTab === "overview";
  const isEstimates = activeTab === "estimates";
  const isEmailTest = activeTab === "email-test";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Sales Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage enquiries and estimate requests</p>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 sticky top-0 z-10">
        <div className="flex gap-0.5 overflow-x-auto">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setStatusFilter("all"); setSearch(""); }}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {id === "overview" && <BarChart3 className="w-4 h-4" />}
              {label}
              {newCounts[id] > 0 && (
                <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {newCounts[id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search + filters */}
      {!isOverview && !isEmailTest && (
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, company…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
            >
              <option value="all">All statuses</option>
              {(isEstimates ? ESTIMATE_STATUSES : CONTACT_STATUSES).map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
            >
              <option value="all">All team</option>
              <option value="unassigned">Unassigned</option>
              {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {isOverview ? (
          <OverviewPanel contacts={contacts} estimates={estimates} loading={contactsLoading || estimatesLoading}
            onNavigate={(tab, status) => { setActiveTab(tab as TabId); setStatusFilter(status ?? "all"); }} />
        ) : isEmailTest ? (
          <EmailTestPanel />
        ) : isEstimates ? (
          <EstimatesTable data={estimates} loading={estimatesLoading} search={search}
            statusFilter={statusFilter} assigneeFilter={assigneeFilter} />
        ) : (
          <EnquiriesTable
            data={contacts.filter((c) => c.form_type === activeTab)}
            loading={contactsLoading} search={search}
            statusFilter={statusFilter} assigneeFilter={assigneeFilter} />
        )}
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   OVERVIEW PANEL
   ═══════════════════════════════════════════════ */
function OverviewPanel({
  contacts, estimates, loading, onNavigate,
}: {
  contacts: ContactSubmission[];
  estimates: EstimateRequest[];
  loading: boolean;
  onNavigate: (tab: string, status?: string) => void;
}) {
  if (loading) return <Skeleton />;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const enquiryTypes: { key: string; label: string }[] = [
    { key: "project", label: "Project Consultation" },
    { key: "bespoke", label: "Bespoke Design" },
    { key: "general", label: "General Enquiries" },
    { key: "trade", label: "Trade / Designers" },
  ];

  return (
    <div className="space-y-8">
      <Section label="Platform Summary">
        <StatCard label="Total Enquiries" value={contacts.length} />
        <StatCard label="Total Estimates" value={estimates.length} />
        <StatCard label="New Enquiries" value={contacts.filter(c => c.status === "new").length} color="bg-amber-50 border-amber-200" />
        <StatCard label="New Estimates" value={estimates.filter(e => e.status === "new").length} color="bg-amber-50 border-amber-200" />
      </Section>

      <Section label="Enquiries by Status">
        {CONTACT_STATUSES.map(s => (
          <button key={s} onClick={() => onNavigate("project", s)} className="text-left">
            <StatCard label={statusLabel(s)} value={contacts.filter(c => c.status === s).length} color={s === "new" ? "bg-amber-50 border-amber-200" : undefined} />
          </button>
        ))}
      </Section>

      <Section label="Enquiries by Type">
        {enquiryTypes.map(({ key, label }) => (
          <button key={key} onClick={() => onNavigate(key)} className="text-left">
            <StatCard label={label} value={contacts.filter(c => c.form_type === key).length} />
          </button>
        ))}
      </Section>

      <Section label="Estimates by Status">
        {ESTIMATE_STATUSES.map(s => (
          <button key={s} onClick={() => onNavigate("estimates", s)} className="text-left">
            <StatCard label={statusLabel(s)} value={estimates.filter(e => e.status === s).length} color={s === "new" ? "bg-amber-50 border-amber-200" : undefined} />
          </button>
        ))}
      </Section>

      <Section label="Team Workload">
        {TEAM_MEMBERS.map(m => (
          <StatCard key={m} label={m}
            value={contacts.filter(c => c.assigned_to === m).length + estimates.filter(e => e.assigned_to === m).length} />
        ))}
        <StatCard label="Unassigned"
          value={contacts.filter(c => !c.assigned_to && c.status !== "archived" && c.status !== "completed").length +
            estimates.filter(e => !e.assigned_to && e.status !== "archived" && e.status !== "completed").length}
          color="bg-red-50 border-red-200" />
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ENQUIRIES TABLE
   ═══════════════════════════════════════════════ */
function EnquiriesTable({
  data, loading, search, statusFilter, assigneeFilter,
}: {
  data: ContactSubmission[]; loading: boolean;
  search: string; statusFilter: string; assigneeFilter: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const updateStatus = useUpdateContactStatus();
  const assignContact = useAssignContact();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (assigneeFilter === "unassigned" && c.assigned_to) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && c.assigned_to !== assigneeFilter) return false;
      if (q && ![c.name, c.surname, c.email, c.company].some((f) => f?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, search, statusFilter, assigneeFilter]);

  if (loading) return <Skeleton />;
  if (filtered.length === 0) return <p className="text-sm text-gray-400 py-12 text-center">No enquiries found</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="hidden md:grid grid-cols-[1.2fr_1.4fr_90px_110px_110px_40px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <span>Name</span><span>Email</span><span>Assigned</span><span>Status</span><span>Date</span><span />
      </div>
      <div className="divide-y divide-gray-100">
        {filtered.map((c) => {
          const open = expandedId === c.id;
          return (
            <div key={c.id}>
              <button
                onClick={() => setExpandedId(open ? null : c.id)}
                className="w-full grid grid-cols-1 md:grid-cols-[1.2fr_1.4fr_90px_110px_110px_40px] gap-2 md:gap-4 items-center px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 truncate">
                  {c.name} {c.surname}
                  {c.company && <span className="text-gray-400 font-normal ml-1.5">· {c.company}</span>}
                </span>
                <span className="text-sm text-gray-500 truncate hidden md:block">{c.email}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full w-fit hidden md:block font-medium ${
                  c.assigned_to ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                }`}>{c.assigned_to || "—"}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full w-fit font-medium ${statusBadge(c.status)}`}>
                  {statusLabel(c.status)}
                </span>
                <span className="text-xs text-gray-400 hidden md:block">{fmtDate(c.created_at)}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 hidden md:block transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="px-5 pb-5 pt-3 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Contact</p>
                      <DetailRow label="Email" value={c.email} />
                      <DetailRow label="Phone" value={c.phone ? `${c.dialing_code || ""} ${c.phone}`.trim() : undefined} />
                      <DetailRow label="Location" value={c.location} />
                      <DetailRow label="Country" value={c.country} />
                      <DetailRow label="Company" value={c.company} />
                      <DetailRow label="Role" value={c.role} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Project</p>
                      <DetailRow label="Form type" value={c.form_type} />
                      <DetailRow label="Project" value={c.project_name} />
                      <DetailRow label="Type" value={c.project_type} />
                      <DetailRow label="Stage" value={c.project_stage} />
                      <DetailRow label="Quantity" value={c.quantity_estimate} />
                      <DetailRow label="Trade assist" value={c.trade_assist} />
                      <DetailRow label="Bespoke type" value={c.bespoke_type} />
                      <DetailRow label="Submitted" value={`${fmtDate(c.created_at)} at ${fmtTime(c.created_at)}`} />
                    </div>
                    <div className="space-y-4">
                      {c.message && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Message</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.message}</p>
                        </div>
                      )}
                      {c.attachment_url && (
                        <a href={c.attachment_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-gray-700 underline underline-offset-4 hover:text-gray-500">
                          <Paperclip className="w-3.5 h-3.5" />
                          View Attachment
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Status:</span>
                      <div className="flex gap-1 flex-wrap">
                        {CONTACT_STATUSES.map((s) => (
                          <button key={s} onClick={() => updateStatus.mutate({ id: c.id, status: s })}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                              c.status === s ? statusBadge(s) : "bg-gray-100 text-gray-400 hover:text-gray-700"
                            }`}>{statusLabel(s)}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Assign:</span>
                      <div className="flex gap-1 flex-wrap">
                        {TEAM_MEMBERS.map((m) => (
                          <button key={m}
                            onClick={() => assignContact.mutate({ id: c.id, assigned_to: c.assigned_to === m ? null : m, contact: c })}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                              c.assigned_to === m ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400 hover:text-gray-700"
                            }`}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(ev) => withPdfSpinner(() => exportContactPdf(c), ev)}
                      className="relative ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ESTIMATES TABLE
   ═══════════════════════════════════════════════ */
function EstimatesTable({
  data, loading, search, statusFilter, assigneeFilter,
}: {
  data: EstimateRequest[]; loading: boolean;
  search: string; statusFilter: string; assigneeFilter: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const updateStatus = useUpdateEstimateStatus();
  const assignEstimate = useAssignEstimate();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (assigneeFilter === "unassigned" && e.assigned_to) return false;
      if (assigneeFilter !== "all" && assigneeFilter !== "unassigned" && e.assigned_to !== assigneeFilter) return false;
      if (q && ![e.full_name, e.email, e.company_name, e.project_name].some((f) => f?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [data, search, statusFilter, assigneeFilter]);

  if (loading) return <Skeleton />;
  if (filtered.length === 0) return <p className="text-sm text-gray-400 py-12 text-center">No estimate requests found</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="hidden md:grid grid-cols-[1.2fr_1fr_100px_90px_90px_110px_110px_40px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
        <span>Client</span><span>Project</span><span>Type</span><span>Designs</span>
        <span>Assigned</span><span>Status</span><span>Date</span><span />
      </div>
      <div className="divide-y divide-gray-100">
        {filtered.map((e) => {
          const open = expandedId === e.id;
          const designs = e.selected_designs ?? [];
          return (
            <div key={e.id}>
              <button
                onClick={() => setExpandedId(open ? null : e.id)}
                className="w-full grid grid-cols-1 md:grid-cols-[1.2fr_1fr_100px_90px_90px_110px_110px_40px] gap-2 md:gap-4 items-center px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 truncate">
                  {e.full_name}
                  {e.company_name && <span className="text-gray-400 font-normal ml-1.5">· {e.company_name}</span>}
                </span>
                <span className="text-sm text-gray-500 truncate hidden md:block">{e.project_name || "—"}</span>
                <span className="text-xs text-gray-500 uppercase hidden md:block">{e.request_type || "estimate"}</span>
                <span className="text-sm text-gray-500 hidden md:block">{designs.length} designs</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full w-fit hidden md:block font-medium ${
                  e.assigned_to ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400"
                }`}>{e.assigned_to || "—"}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full w-fit font-medium ${statusBadge(e.status)}`}>
                  {statusLabel(e.status)}
                </span>
                <span className="text-xs text-gray-400 hidden md:block">{fmtDate(e.created_at)}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 hidden md:block transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </button>

              {open && (
                <div className="px-5 pb-5 pt-3 bg-gray-50 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Client</p>
                      <DetailRow label="Name" value={e.full_name} />
                      <DetailRow label="Email" value={e.email} />
                      <DetailRow label="Phone" value={e.phone} />
                      <DetailRow label="Company" value={e.company_name} />
                      <DetailRow label="Role" value={e.professional_role} />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Project</p>
                      <DetailRow label="Project" value={e.project_name} />
                      <DetailRow label="Location" value={e.project_location} />
                      <DetailRow label="Stage" value={e.project_stage} />
                      <DetailRow label="Request type" value={e.request_type} />
                      <DetailRow label="Submitted" value={`${fmtDate(e.created_at)} at ${fmtTime(e.created_at)}`} />
                    </div>
                    <div>
                      {e.project_notes && (
                        <div>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Notes</p>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{e.project_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {designs.length > 0 && (
                    <div className="mb-5 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Selected Designs ({designs.length})
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {designs.map((d, i) => (
                          <div key={i}>
                            {d.product_image && (
                              <div className="aspect-[3/4] bg-gray-100 rounded overflow-hidden mb-2">
                                <img src={d.product_image} alt={d.product_name} className="w-full h-full object-cover" loading="lazy" />
                              </div>
                            )}
                            <p className="text-xs font-medium text-gray-800 leading-tight truncate">{d.product_name}</p>
                            {d.product_colour && <p className="text-xs text-gray-500">{d.product_colour}</p>}
                            {d.product_sku && <p className="text-xs text-gray-400">{d.product_sku}</p>}
                            {d.sample_requested && (
                              <span className="inline-block mt-1 text-[10px] tracking-wide uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                Sample
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {e.wall_dimensions && e.wall_dimensions.length > 0 && (
                    <div className="mb-5 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Ruler className="w-3.5 h-3.5" /> Wall Dimensions
                      </p>
                      <div className="space-y-1.5">
                        {e.wall_dimensions.map((w, i) => (
                          <p key={i} className="text-sm text-gray-700">
                            <span className="text-gray-400">{w.name || `Wall ${i + 1}`}:</span>{" "}
                            {w.width}cm × {w.height}cm
                            {w.notes && <span className="text-gray-400 ml-2">— {w.notes}</span>}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Status:</span>
                      <div className="flex gap-1 flex-wrap">
                        {ESTIMATE_STATUSES.map((s) => (
                          <button key={s} onClick={() => updateStatus.mutate({ id: e.id, status: s })}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                              e.status === s ? statusBadge(s) : "bg-gray-100 text-gray-400 hover:text-gray-700"
                            }`}>{statusLabel(s)}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Assign:</span>
                      <div className="flex gap-1 flex-wrap">
                        {TEAM_MEMBERS.map((m) => (
                          <button key={m}
                            onClick={() => assignEstimate.mutate({ id: e.id, assigned_to: e.assigned_to === m ? null : m, estimate: e })}
                            className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                              e.assigned_to === m ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-400 hover:text-gray-700"
                            }`}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={(ev) => withPdfSpinner(() => exportEstimatePdf(e), ev)}
                      className="relative ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors font-medium"
                    >
                      <Download className="w-3.5 h-3.5" /> Download PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 min-w-[80px] shrink-0">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-14 bg-white border border-gray-200 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EMAIL TEST PANEL
   ═══════════════════════════════════════════════ */

const EMAIL_TEMPLATES = [
  {
    name: "contact-confirmation-project",
    displayName: "Project consultation confirmation",
    description: "Sent to the visitor after submitting a project consultation form.",
    previewData: { name: "Jane Doe" },
  },
  {
    name: "contact-confirmation-bespoke",
    displayName: "Bespoke design confirmation",
    description: "Sent to the visitor after submitting a bespoke design enquiry.",
    previewData: { name: "Jane Doe" },
  },
  {
    name: "contact-confirmation-trade",
    displayName: "Trade / Designers confirmation",
    description: "Sent to the visitor after submitting a trade enquiry.",
    previewData: { name: "Jane Doe" },
  },
  {
    name: "contact-confirmation-general",
    displayName: "General enquiry confirmation",
    description: "Sent to the visitor after submitting a general enquiry.",
    previewData: { name: "Jane Doe" },
  },
  {
    name: "contact-notification",
    displayName: "Contact team notification",
    description: "Sent to the team when a new contact form is submitted.",
    previewData: {
      formType: "project",
      name: "Jane",
      surname: "Doe",
      email: "jane@example.com",
      phone: "+27 82 123 4567",
      company: "Studio Nine",
      message: "I'm interested in a custom wallcovering for a hotel lobby.",
      projectType: "Hospitality",
      projectStage: "Design",
    },
  },
  {
    name: "estimate-confirmation",
    displayName: "Estimate confirmation",
    description: "Sent to the client after they request an estimate, with inline summary.",
    previewData: {
      name: "Jane Doe",
      projectName: "Hotel Lobby",
      projectLocation: "Cape Town",
      projectStage: "Design",
      requestType: "estimate",
      designs: [
        { name: "Panoramic Mural", colour: "Sage", sku: "PM-001", sampleRequested: true },
        { name: "Linear Texture", colour: "Charcoal", sku: "LT-042", sampleRequested: false },
      ],
      wallDimensions: [{ name: "Reception Wall", width: "6.2", height: "3.1", notes: "Feature wall" }],
    },
  },
  {
    name: "estimate-notification",
    displayName: "Estimate team notification",
    description: "Sent to the team when a new estimate is requested.",
    previewData: {
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+27 82 123 4567",
      companyName: "Studio Nine",
      projectName: "Hotel Lobby",
      projectLocation: "Cape Town",
      projectStage: "Design",
      requestType: "estimate",
      designCount: 3,
      wallCount: 2,
      projectNotes: "Need to match existing interior palette.",
      designs: [
        { name: "Panoramic Mural", colour: "Sage", sku: "PM-001", category: "Murals", sampleRequested: true },
        { name: "Linear Texture", colour: "Charcoal", sku: "LT-042", category: "Textures", sampleRequested: false },
        { name: "Botanical Weave", colour: "Natural", sku: "BW-019", category: "Weaves", sampleRequested: true },
      ],
      wallDimensions: [
        { name: "Reception Wall", width: "6.2", height: "3.1", notes: "Feature wall" },
        { name: "Corridor", width: "12", height: "2.8" },
      ],
    },
  },
  {
    name: "assignment-notification",
    displayName: "Team member assignment",
    description: "Sent to a team member when an enquiry is assigned to them.",
    previewData: {
      assigneeName: "Felicity",
      enquiryType: "estimate",
      clientName: "Jane Doe",
      clientEmail: "jane@example.com",
      clientPhone: "+27 82 123 4567",
      clientCompany: "Studio Nine",
      clientRole: "Interior Designer",
      clientLocation: "Cape Town",
      projectName: "Boutique Hotel Lobby",
      projectLocation: "Cape Town",
      projectStage: "Design",
      requestType: "estimate",
      designCount: 3,
      wallCount: 2,
      projectNotes: "Need to match existing interior palette.",
      designs: [
        { name: "Panoramic Mural", colour: "Sage", sku: "PM-001", category: "Murals", sampleRequested: true },
        { name: "Linear Texture", colour: "Charcoal", sku: "LT-042", category: "Textures", sampleRequested: false },
      ],
      wallDimensions: [
        { name: "Reception Wall", width: "6.2", height: "3.1", notes: "Feature wall" },
        { name: "Corridor", width: "12", height: "2.8" },
      ],
    },
  },
] as const;

function EmailTestPanel() {
  const { toast } = useToast();
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, "success" | "error">>({});

  const sendTest = async (templateName: string, previewData: Record<string, any>) => {
    if (!recipientEmail.trim()) {
      toast({ title: "Enter a recipient email first", variant: "destructive" });
      return;
    }
    setSending(templateName);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName,
          recipientEmail: recipientEmail.trim(),
          templateData: previewData,
        },
      });
      if (error) throw error;
      setResults((prev) => ({ ...prev, [templateName]: "success" }));
      toast({ title: `Test sent: ${templateName}` });
    } catch (err: any) {
      setResults((prev) => ({ ...prev, [templateName]: "error" }));
      toast({ title: err?.message || "Send failed", variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const sendAll = async () => {
    for (const t of EMAIL_TEMPLATES) {
      await sendTest(t.name, { ...t.previewData });
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3">
        <p className="text-sm text-amber-800">
          Emails go through the full pipeline (render → queue → deliver). Requires{" "}
          <code className="text-xs bg-amber-100 px-1 rounded">send-transactional-email</code> and{" "}
          <code className="text-xs bg-amber-100 px-1 rounded">LOVABLE_API_KEY</code> to be configured in this Supabase project.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        <div className="flex-1 w-full md:w-auto">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
            Test Recipient Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>
        </div>
        <button
          onClick={sendAll}
          disabled={!!sending || !recipientEmail.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <Send className="w-4 h-4" />
          Send All Templates
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Each template will be sent with sample data to the address above.
      </p>

      <div className="space-y-3">
        {EMAIL_TEMPLATES.map((t) => (
          <div
            key={t.name}
            className="border border-gray-200 rounded-lg px-5 py-4 bg-white flex flex-col md:flex-row md:items-center gap-3 md:gap-5"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{t.displayName}</span>
                {results[t.name] === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                {results[t.name] === "error" && <XCircle className="w-4 h-4 text-red-500" />}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              <p className="text-[11px] text-gray-400 mt-1 font-mono">{t.name}</p>
            </div>
            <button
              onClick={() => sendTest(t.name, { ...t.previewData })}
              disabled={!!sending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-all shrink-0"
            >
              {sending === t.name ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send Test
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
