import { useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import type { Installation } from "@/hooks/useInstallations";
import { INSTALLERS, INSTALLATION_STAGES } from "../lib/stages";
import { getInstallationStage } from "../lib/stages";

interface CompletedViewProps {
  installations: Installation[];
  onRowClick: (installation: Installation) => void;
}

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function CompletedView({ installations, onRowClick }: CompletedViewProps) {
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [installerFilter, setInstallerFilter] = useState("all");

  const completed = installations.filter((i) => i.status === "completed" || i.status === "signed_off");

  // Month options from actual data
  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    completed.forEach((i) => {
      if (i.scheduled_date) {
        const d = new Date(i.scheduled_date + "T00:00:00");
        seen.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`);
      }
    });
    return Array.from(seen).sort().reverse().map((key) => {
      const [y, m] = key.split("-");
      return { value: key, label: `${MONTH_NAMES[parseInt(m)]} ${y}` };
    });
  }, [completed]);

  const filtered = useMemo(() => {
    let result = [...completed];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q) || (i.client_name ?? "").toLowerCase().includes(q));
    }
    if (monthFilter !== "all") {
      result = result.filter((i) => {
        if (!i.scheduled_date) return false;
        const d = new Date(i.scheduled_date + "T00:00:00");
        return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}` === monthFilter;
      });
    }
    if (installerFilter !== "all") {
      result = result.filter((i) => (i.installers ?? []).includes(installerFilter));
    }
    return result.sort((a, b) => (b.scheduled_date ?? "").localeCompare(a.scheduled_date ?? ""));
  }, [completed, search, monthFilter, installerFilter]);

  const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300">
          <option value="all">All Months</option>
          {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={installerFilter} onChange={(e) => setInstallerFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300">
          <option value="all">All Installers</option>
          {INSTALLERS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400">No completed installations found</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Installation","Client","Date","Installers","Status","Sign-off"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inst) => {
                const stage = getInstallationStage(inst.status);
                const openSnags = (inst.snags ?? []).filter((s) => !s.resolved);
                return (
                  <tr key={inst.id} onClick={() => onRowClick(inst)}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-gray-900">{inst.title}</p>
                      {inst.suburb && <p className="text-xs text-gray-400">{inst.suburb}</p>}
                      {openSnags.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                          {openSnags.length} snag{openSnags.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{inst.client_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{inst.scheduled_date ? fmtDate(inst.scheduled_date) : "—"}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{inst.installers?.join(", ") || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium ${stage.color} ${stage.textColor}`}>
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {inst.signoff
                        ? <span className="text-emerald-600">{inst.signoff.signed_by}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
