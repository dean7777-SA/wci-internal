import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, ArrowLeft, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Project, ProjectStage } from "@/hooks/useProjects";
import { useUpdateProject, useProjectHistory, useDeleteProject } from "@/hooks/useProjects";
import {
  getStage, getNextStage, getPrevStage, STAGES,
  PROJECT_TYPES, TEAM_MEMBERS, daysInStage,
} from "../lib/stages";

interface ProjectDrawerProps {
  project: Project | null;
  onClose: () => void;
}

type DrawerTab = "details" | "history";
const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300 transition-all";

export function ProjectDrawer({ project, onClose }: ProjectDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("details");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { toast } = useToast();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { data: history = [] } = useProjectHistory(project?.id ?? "");

  const [form, setForm] = useState<Partial<Project>>({});
  const [lastProjectId, setLastProjectId] = useState<string | null>(null);
  if (project && project.id !== lastProjectId) {
    setLastProjectId(project.id);
    setForm({ ...project });
    setActiveTab("details");
  }

  if (!project) return null;

  const stage = getStage(project.current_stage);
  const nextStage = getNextStage(project.current_stage);
  const prevStage = getPrevStage(project.current_stage);
  const days = daysInStage(project.stage_entered_at);

  function field<K extends keyof Project>(key: K) { return form[key] as Project[K]; }
  function setField<K extends keyof Project>(key: K, value: Project[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ id: project.id, ...form } as any);
      toast({ title: "Project saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  async function handleArchive() {
    if (!project) return;
    const newStatus = project.status === "completed" ? "active" : "completed";
    try {
      await updateProject.mutateAsync({ id: project.id, status: newStatus } as any);
      toast({ title: newStatus === "completed" ? "Project archived" : "Project restored" });
      onClose();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!project) return;
    try {
      await deleteProject.mutateAsync(project.id);
      toast({ title: `${project.project_code} deleted` });
      onClose();
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  async function handleMoveStage(targetStage: ProjectStage) {
    if (!project) return;
    try {
      await updateProject.mutateAsync({ id: project.id, current_stage: targetStage });
      toast({ title: `Moved to ${getStage(targetStage).label}` });
    } catch {
      toast({ title: "Move failed", variant: "destructive" });
    }
  }

  return (
    <>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-50"
      />
      <motion.div
        key="drawer"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ duration: 0.4, ease }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[640px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-7 pt-8 pb-5 border-b border-gray-200 shrink-0">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="font-mono text-[11px] text-gray-400 tracking-wider mb-1">{project.project_code}</p>
              <h2 className="text-xl font-semibold text-gray-900 leading-tight">{project.name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{project.client_name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0 mt-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs tracking-wider uppercase px-3 py-1 rounded-full font-medium ${stage.color} ${stage.textColor}`}>
              {stage.label}
            </span>
            <span className="text-xs text-gray-400">{days}d in stage</span>
            <div className="ml-auto flex items-center gap-2">
              {prevStage && (
                <button onClick={() => handleMoveStage(prevStage)} disabled={updateProject.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-400 transition-colors disabled:opacity-40">
                  <ArrowLeft className="w-3 h-3" />{getStage(prevStage).label}
                </button>
              )}
              {nextStage && (
                <button onClick={() => handleMoveStage(nextStage)} disabled={updateProject.isPending}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40">
                  {getStage(nextStage).label}<ArrowRight className="w-3 h-3" />
                </button>
              )}
              <button onClick={handleArchive} disabled={updateProject.isPending}
                title={project.status === "completed" ? "Restore" : "Archive"}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-40">
                {project.status === "completed" ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-2 px-7 py-3 border-b border-gray-100 shrink-0">
          {(["details", "history"] as DrawerTab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs tracking-[0.12em] uppercase px-4 py-1.5 rounded-full transition-all duration-200 ${
                activeTab === tab ? "bg-gray-900 text-white" : "text-gray-400 hover:text-gray-700"
              }`}>{tab}</button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <AnimatePresence mode="wait">
            {activeTab === "details" ? (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="space-y-6">
                <Section label="Project">
                  <Field label="Project Name">
                    <input type="text" value={(field("name") as string) ?? ""} onChange={(e) => setField("name", e.target.value as any)} className={inputClass} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Project Type">
                      <select value={(field("project_type") as string) ?? ""} onChange={(e) => setField("project_type", e.target.value as any)} className={inputClass}>
                        {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Assigned To">
                      <select value={(field("assigned_to") as string) ?? ""} onChange={(e) => setField("assigned_to", e.target.value as any)} className={inputClass}>
                        <option value="">Unassigned</option>
                        {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Location">
                      <input type="text" value={(field("location") as string) ?? ""} onChange={(e) => setField("location", e.target.value as any)} className={inputClass} />
                    </Field>
                    <Field label="Estimated Value (ZAR)">
                      <input type="number" value={(field("estimated_value") as number) ?? ""} onChange={(e) => setField("estimated_value", e.target.valueAsNumber as any)} className={inputClass} placeholder="0" />
                    </Field>
                  </div>
                  <Field label="Site Address">
                    <input type="text" value={(field("site_address") as string) ?? ""} onChange={(e) => setField("site_address", e.target.value as any)} className={inputClass} />
                  </Field>
                  <Field label="Notes">
                    <textarea value={(field("notes") as string) ?? ""} onChange={(e) => setField("notes", e.target.value as any)} rows={3} className={`${inputClass} resize-none`} />
                  </Field>
                </Section>

                <Section label="Client">
                  <Field label="Client Name">
                    <input type="text" value={(field("client_name") as string) ?? ""} onChange={(e) => setField("client_name", e.target.value as any)} className={inputClass} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Main Contact">
                      <input type="text" value={(field("contact_person") as string) ?? ""} onChange={(e) => setField("contact_person", e.target.value as any)} className={inputClass} />
                    </Field>
                    <Field label="Contact Role">
                      <input type="text" value={(field("contact_role") as string) ?? ""} onChange={(e) => setField("contact_role", e.target.value as any)} className={inputClass} placeholder="e.g. Architect" />
                    </Field>
                  </div>
                  <Field label="Contact Email">
                    <input type="email" value={(field("contact_email") as string) ?? ""} onChange={(e) => setField("contact_email", e.target.value as any)} className={inputClass} />
                  </Field>
                </Section>

                <button onClick={handleSave} disabled={updateProject.isPending}
                  className="w-full text-sm py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40">
                  {updateProject.isPending ? "Saving…" : "Save Changes"}
                </button>

                <div className="pt-2 border-t border-gray-100">
                  {!deleteConfirm ? (
                    <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3 h-3" /> Delete Project
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Delete {project.project_code}?</span>
                      <button onClick={handleDelete} disabled={deleteProject.isPending} className="text-xs text-red-500 hover:text-red-600 disabled:opacity-40">
                        {deleteProject.isPending ? "Deleting…" : "Confirm"}
                      </button>
                      <button onClick={() => setDeleteConfirm(false)} className="text-xs text-gray-400 hover:text-gray-700">Cancel</button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-12">No stage changes yet</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry) => {
                      const from = STAGES.find((s) => s.id === entry.from_stage);
                      const to = STAGES.find((s) => s.id === entry.to_stage);
                      return (
                        <div key={entry.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-2 flex-1">
                            <span className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium ${from?.color} ${from?.textColor}`}>{from?.label ?? entry.from_stage}</span>
                            <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                            <span className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium ${to?.color} ${to?.textColor}`}>{to?.label ?? entry.to_stage}</span>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">{fmtDate(entry.changed_at)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">{label}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}
