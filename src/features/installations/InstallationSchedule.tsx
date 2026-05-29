import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LayoutGrid, CalendarDays, BarChart2, Archive, List, ChevronDown } from "lucide-react";
import { useInstallations } from "@/hooks/useInstallations";
import type { Installation } from "@/hooks/useInstallations";
import { KanbanBoard } from "./components/KanbanBoard";
import { CalendarView } from "./components/CalendarView";
import { DashboardView } from "./components/DashboardView";
import { CompletedView } from "./components/CompletedView";
import { InstallationDetailPanel } from "./components/InstallationDetailPanel";
import { NewInstallationDialog } from "./components/NewInstallationDialog";
import { InstallationListView } from "./components/InstallationListView";
import { INSTALLERS, installerColor, installerInitials } from "./lib/stages";

type Tab = "kanban" | "calendar" | "dashboard" | "completed";
type KanbanSubView = "board" | "list";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "kanban",    label: "Kanban",    icon: LayoutGrid   },
  { id: "calendar",  label: "Calendar",  icon: CalendarDays },
  { id: "dashboard", label: "Dashboard", icon: BarChart2    },
  { id: "completed", label: "Completed", icon: Archive      },
];

export function InstallationSchedule() {
  const [activeTab, setActiveTab] = useState<Tab>("kanban");
  const [kanbanView, setKanbanView] = useState<KanbanSubView>("board");
  const [selected, setSelected] = useState<Installation | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [installerFilter, setInstallerFilter] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [showSiteInspections, setShowSiteInspections] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const { data: installations = [], isLoading } = useInstallations();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = installerFilter.length === 0
    ? installations
    : installations.filter((i) =>
        i.installers?.some((name) => installerFilter.includes(name))
      );

  function openDetail(inst: Installation) {
    setSelected(inst);
  }

  function handleCreated(id: string) {
    const inst = installations.find((i) => i.id === id);
    if (inst) setSelected(inst);
  }

  function toggleInstaller(name: string) {
    setInstallerFilter((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-nav bar */}
      <div className="flex items-center justify-between mb-4 gap-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Board/List toggle — only for Kanban tab */}
          {activeTab === "kanban" && (
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
              {([{ id: "board" as KanbanSubView, icon: LayoutGrid }, { id: "list" as KanbanSubView, icon: List }]).map(({ id, icon: Icon }) => (
                <button key={id} onClick={() => setKanbanView(id)}
                  className={`flex items-center px-2.5 py-1.5 rounded-lg transition-all ${
                    kanbanView === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          )}

          {/* Installer multi-select filter */}
          <div className="relative" ref={filterRef}>
            <button onClick={() => setFilterOpen((o) => !o)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors ${
                installerFilter.length > 0
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}>
              {installerFilter.length === 0 ? (
                <>All Installers <ChevronDown className="w-3 h-3" /></>
              ) : (
                <div className="flex items-center gap-1">
                  {installerFilter.map((name) => {
                    const c = installerColor(name);
                    return (
                      <span key={name} className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold ${c.bg} ${c.text}`}>
                        {installerInitials(name)}
                      </span>
                    );
                  })}
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </div>
              )}
            </button>

            {filterOpen && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-white rounded-xl border border-gray-200 shadow-lg p-2 min-w-[160px]">
                {INSTALLERS.map((name) => {
                  const c = installerColor(name);
                  const active = installerFilter.includes(name);
                  return (
                    <button key={name} onClick={() => toggleInstaller(name)}
                      className={`flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs transition-colors ${
                        active ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}>
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${c.bg} ${c.text}`}>
                        {installerInitials(name)}
                      </span>
                      <span className="text-gray-700">{name}</span>
                      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gray-900" />}
                    </button>
                  );
                })}
                {installerFilter.length > 0 && (
                  <>
                    <div className="h-px bg-gray-100 my-1.5" />
                    <button onClick={() => setInstallerFilter([])}
                      className="w-full text-xs text-gray-400 hover:text-gray-700 py-1.5 px-2.5 rounded-lg hover:bg-gray-50 text-left transition-colors">
                      Clear filter
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Site inspection toggle — calendar only */}
          {activeTab === "calendar" && (
            <button
              onClick={() => setShowSiteInspections((v) => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-colors ${
                showSiteInspections
                  ? "border-violet-600 bg-violet-600 text-white"
                  : "border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}>
              <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-violet-100 text-violet-700 text-[9px] font-bold">SI</span>
              Site Inspections
            </button>
          )}
        </div>

        <button onClick={() => setNewOpen(true)}
          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-700 transition-colors shrink-0">
          <Plus className="w-3.5 h-3.5" />
          New Installation
        </button>
      </div>

      {/* Views */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-400">Loading installations…</div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div key={activeTab + kanbanView} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="flex-1 min-h-0">
            {activeTab === "kanban" && kanbanView === "board" && (
              <KanbanBoard installations={filtered} onCardClick={openDetail} />
            )}
            {activeTab === "kanban" && kanbanView === "list" && (
              <div className="overflow-y-auto h-full">
                <InstallationListView installations={filtered} onRowClick={openDetail} />
              </div>
            )}
            {activeTab === "calendar" && (
              <CalendarView installations={filtered} onChipClick={openDetail} showSiteInspections={showSiteInspections} />
            )}
            {activeTab === "dashboard" && (
              <DashboardView installations={filtered} onCardClick={openDetail} />
            )}
            {activeTab === "completed" && (
              <CompletedView installations={filtered} onRowClick={openDetail} />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Detail panel — only render when an installation is selected */}
      {selected && (
        <InstallationDetailPanel
          installation={selected}
          allInstallations={installations}
          onClose={() => setSelected(null)}
        />
      )}

      {/* New installation dialog */}
      <NewInstallationDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={handleCreated}
        allInstallations={installations}
      />
    </div>
  );
}
