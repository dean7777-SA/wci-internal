import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, List, Plus } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";
import type { Project } from "@/hooks/useProjects";
import { STAGES, daysInStage } from "./lib/stages";
import { Board } from "./components/Board";
import { ProjectsTable } from "./components/ProjectsTable";
import { ProjectDrawer } from "./components/ProjectDrawer";
import { NewProjectDialog } from "./components/NewProjectDialog";

type SubTab = "board" | "list";

function KpiCard({ eyebrow, value, color = "bg-white border-gray-200" }: { eyebrow: string; value: number | string; color?: string }) {
  return (
    <div className={`border rounded-xl px-5 py-5 ${color}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">{eyebrow}</p>
      <p className="text-3xl font-semibold text-gray-900 leading-none">{value}</p>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-8">
      {STAGES.map((s) => (
        <div key={s.id} className="w-[260px] shrink-0 space-y-2.5">
          <div className="h-5 w-24 rounded-full bg-gray-100 animate-pulse mb-3" />
          {[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ))}
    </div>
  );
}

export function ProjectsDashboard() {
  const [subTab, setSubTab] = useState<SubTab>("board");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data: projects = [], isLoading } = useProjects();
  const displayProjects = showArchived ? projects : projects.filter((p) => p.status !== "completed");

  const kpis = useMemo(() => {
    const active = projects.filter((p) => p.status === "active");
    const stuck = active.filter((p) => daysInStage(p.stage_entered_at) > 14 && p.current_stage !== "completed");
    const now = new Date();
    const completedThisMonth = projects.filter((p) => {
      if (p.current_stage !== "completed") return false;
      const u = new Date(p.updated_at);
      return u.getMonth() === now.getMonth() && u.getFullYear() === now.getFullYear();
    });
    const totalValue = active.reduce((sum, p) => sum + (p.estimated_value ?? 0), 0);
    return { active: active.length, stuck: stuck.length, completedThisMonth: completedThisMonth.length, totalValue };
  }, [projects]);

  const fmtZAR = (n: number) => n === 0 ? "—" : `R ${n.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <KpiCard eyebrow="Active Projects" value={kpis.active} />
        <KpiCard eyebrow="Pipeline Value" value={fmtZAR(kpis.totalValue)} color="bg-violet-50 border-violet-200" />
        <KpiCard eyebrow="Completed This Month" value={kpis.completedThisMonth} color="bg-emerald-50 border-emerald-200" />
        {kpis.stuck > 0
          ? <KpiCard eyebrow="Stuck >14 Days" value={kpis.stuck} color="bg-orange-50 border-orange-200" />
          : <KpiCard eyebrow="Total Projects" value={projects.length} />}
      </div>

      {/* Sub-tab row + Add button */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          {([
            { id: "board" as SubTab, label: "Board", icon: LayoutGrid },
            { id: "list" as SubTab, label: "List", icon: List },
          ] as { id: SubTab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSubTab(id)}
              className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full transition-all ${
                subTab === id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:text-gray-900"
              }`}>
              <Icon className="w-3 h-3" />{label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {projects.some((p) => p.status === "completed") && (
            <button onClick={() => setShowArchived((v) => !v)}
              className={`text-xs px-4 py-1.5 rounded-full border transition-all ${
                showArchived ? "border-gray-400 text-gray-900 bg-gray-100" : "border-gray-200 text-gray-400 hover:text-gray-700"
              }`}>
              {showArchived ? "Hide Archived" : "Show Archived"}
            </button>
          )}
          <button onClick={() => setNewDialogOpen(true)}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors">
            <Plus className="w-3.5 h-3.5" />Add Project
          </button>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <BoardSkeleton />
          </motion.div>
        ) : subTab === "board" ? (
          <motion.div key="board" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Board projects={displayProjects} onCardClick={setSelectedProject} />
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <ProjectsTable projects={displayProjects} onRowClick={setSelectedProject} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {selectedProject && (() => {
          const liveProject = projects.find((p) => p.id === selectedProject.id) ?? selectedProject;
          return <ProjectDrawer project={liveProject} onClose={() => setSelectedProject(null)} />;
        })()}
      </AnimatePresence>

      {/* New project dialog */}
      <NewProjectDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        onCreated={(id) => {
          const created = projects.find((p) => p.id === id);
          if (created) setSelectedProject(created);
        }}
      />
    </div>
  );
}
