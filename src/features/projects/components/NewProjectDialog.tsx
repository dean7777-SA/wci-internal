import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useCreateProject } from "@/hooks/useProjects";
import type { NewProjectInput, ProjectType } from "@/hooks/useProjects";
import { PROJECT_TYPES, TEAM_MEMBERS } from "../lib/stages";

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (projectId: string) => void;
}

const empty: NewProjectInput = {
  name: "", client_name: "", contact_person: "", contact_role: "",
  contact_email: "", location: "", site_address: "",
  project_type: "residential", assigned_to: "", estimated_value: undefined, notes: "",
};

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300 transition-all bg-white";

export function NewProjectDialog({ open, onClose, onCreated }: NewProjectDialogProps) {
  const [form, setForm] = useState<NewProjectInput>({ ...empty });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const createProject = useCreateProject();

  function set<K extends keyof NewProjectInput>(key: K, value: NewProjectInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.client_name.trim()) {
      setError("Project name and client name are required.");
      return;
    }
    try {
      const created = await createProject.mutateAsync({
        ...form,
        estimated_value: form.estimated_value || undefined,
        assigned_to: form.assigned_to || undefined,
        contact_person: form.contact_person || undefined,
        contact_role: form.contact_role || undefined,
        contact_email: form.contact_email || undefined,
        location: form.location || undefined,
        site_address: form.site_address || undefined,
        notes: form.notes || undefined,
      });
      setForm({ ...empty });
      onCreated?.(created.id);
      onClose();
    } catch (err: any) {
      console.error("Create project error:", err);
      const msg = err?.message ?? err?.error_description ?? JSON.stringify(err);
      setError(msg);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="dialog-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-50" />

          <motion.div key="dialog"
            initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-gray-200 shrink-0">
                <h2 className="text-lg font-semibold text-gray-900">Add Project</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-6 space-y-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Project</p>

                <Field label="Project Name *">
                  <input type="text" required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. House M" className={inputClass} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Project Type *">
                    <select required value={form.project_type} onChange={(e) => set("project_type", e.target.value as ProjectType)} className={inputClass}>
                      {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Assigned To">
                    <select value={form.assigned_to ?? ""} onChange={(e) => set("assigned_to", e.target.value)} className={inputClass}>
                      <option value="">Unassigned</option>
                      {TEAM_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Location">
                    <input type="text" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Cape Town" className={inputClass} />
                  </Field>
                  <Field label="Estimated Value (ZAR)">
                    <input type="number" value={form.estimated_value ?? ""} onChange={(e) => set("estimated_value", e.target.valueAsNumber || undefined)} placeholder="0" className={inputClass} />
                  </Field>
                </div>

                <Field label="Site Address">
                  <input type="text" value={form.site_address ?? ""} onChange={(e) => set("site_address", e.target.value)} className={inputClass} />
                </Field>

                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide pt-2">Client</p>

                <Field label="Client Name *">
                  <input type="text" required value={form.client_name} onChange={(e) => set("client_name", e.target.value)} className={inputClass} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Main Contact">
                    <input type="text" value={form.contact_person ?? ""} onChange={(e) => set("contact_person", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Contact Role">
                    <input type="text" value={form.contact_role ?? ""} onChange={(e) => set("contact_role", e.target.value)} placeholder="e.g. Architect" className={inputClass} />
                  </Field>
                </div>

                <Field label="Contact Email">
                  <input type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} className={inputClass} />
                </Field>

                <Field label="Notes">
                  <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                </Field>

                <div className="flex gap-3 pt-2 pb-2">
                  <button type="button" onClick={onClose} className="flex-1 text-sm py-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={createProject.isPending} className="flex-1 text-sm py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40">
                    {createProject.isPending ? "Creating…" : "+ Add Project"}
                  </button>
                </div>
                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
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
