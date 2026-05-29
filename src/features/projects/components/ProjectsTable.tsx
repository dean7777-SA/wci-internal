import { useState, useMemo } from "react";
import { Search, ChevronDown } from "lucide-react";
import type { Project, ProjectStage } from "@/hooks/useProjects";
import { getStage, daysInStage, STAGES, PROJECT_TYPES, TEAM_MEMBERS } from "../lib/stages";

interface ProjectsTableProps {
  projects: Project[];
  onRowClick: (project: Project) => void;
}

type SortKey = "project_code" | "name" | "client_name" | "current_stage" | "updated_at" | "days_in_stage";
type SortDir = "asc" | "desc";

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  hospitality: "Hospitality",
  commercial: "Commercial",
  retail: "Retail",
};

export function ProjectsTable({ projects, onRowClick }: ProjectsTableProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<ProjectStage | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filtered = useMemo(() => {
    let result = [...projects];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.client_name.toLowerCase().includes(q) ||
        p.project_code.toLowerCase().includes(q) ||
        (p.location ?? "").toLowerCase().includes(q)
      );
    }
    if (stageFilter !== "all") result = result.filter((p) => p.current_stage === stageFilter);
    if (typeFilter !== "all") result = result.filter((p) => p.project_type === typeFilter);
    if (assignedFilter !== "all") result = result.filter((p) => p.assigned_to === assignedFilter);
    result.sort((a, b) => {
      let valA: string | number = sortKey === "days_in_stage" ? daysInStage(a.stage_entered_at) : (a[sortKey] as string) ?? "";
      let valB: string | number = sortKey === "days_in_stage" ? daysInStage(b.stage_entered_at) : (b[sortKey] as string) ?? "";
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [projects, search, stageFilter, typeFilter, assignedFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" placeholder="Search projects…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300" />
        </div>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as ProjectStage | "all")}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
          <option value="all">All Stages</option>
          {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
          <option value="all">All Types</option>
          {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select value={assignedFilter} onChange={(e) => setAssignedFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white">
          <option value="all">All Team</option>
          {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} project{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {([
                { key: "project_code" as SortKey, label: "Code" },
                { key: "name" as SortKey, label: "Project" },
                { key: "client_name" as SortKey, label: "Client" },
                { key: "current_stage" as SortKey, label: "Stage" },
                { key: "days_in_stage" as SortKey, label: "Days" },
                { key: "updated_at" as SortKey, label: "Updated" },
              ]).map(({ key, label }) => (
                <th key={key} onClick={() => toggleSort(key)}
                  className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 transition-colors select-none">
                  <span className="flex items-center gap-1">
                    {label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${sortKey === key ? (sortDir === "asc" ? "rotate-180" : "") : "opacity-20"}`} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-sm text-gray-400">No projects found</td></tr>
            )}
            {filtered.map((project) => {
              const stage = getStage(project.current_stage);
              const days = daysInStage(project.stage_entered_at);
              const isStuck = days > 14 && project.current_stage !== "completed";
              return (
                <tr key={project.id} onClick={() => onRowClick(project)}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs text-gray-400">{project.project_code}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-gray-900">{project.name}</p>
                    {project.location && <p className="text-xs text-gray-400">{project.location}</p>}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-gray-500">{project.client_name}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full font-medium ${stage.color} ${stage.textColor}`}>
                      {stage.label}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-sm ${isStuck ? "text-orange-500 font-medium" : "text-gray-400"}`}>
                      {days}d {isStuck && "⚠"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-gray-400">{fmtDate(project.updated_at)}</td>
                  <td className="px-4 py-3.5 text-right">
                    <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90 inline" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
