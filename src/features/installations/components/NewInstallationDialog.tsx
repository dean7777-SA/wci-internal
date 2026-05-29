import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useCreateInstallation } from "@/hooks/useInstallations";
import type { NewInstallationInput, Installation } from "@/hooks/useInstallations";
import type { InstallationPriority } from "../lib/stages";
import { INSTALLERS, OWNERS, SITE_INSPECTORS } from "../lib/stages";
import { useProjects } from "@/hooks/useProjects";

interface NewInstallationDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  allInstallations?: Installation[];
}

const empty: NewInstallationInput = {
  title: "", client_name: "", site_address: "", suburb: "",
  scheduled_date: "", scheduled_end_date: "", scheduled_time_start: "", scheduled_time_end: "",
  date_tbc: true, priority: "medium", project_id: "",
  site_inspection_required: false, site_inspection_date: "",
  site_inspection_owner: "", notes: "", installers: [], owner: "",
};

const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300 bg-white";

export function NewInstallationDialog({ open, onClose, onCreated, allInstallations = [] }: NewInstallationDialogProps) {
  const [form, setForm] = useState<NewInstallationInput>({ ...empty });
  const { toast } = useToast();
  const create = useCreateInstallation();
  const { data: projects = [] } = useProjects();

  function set<K extends keyof NewInstallationInput>(key: K, value: NewInstallationInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInstaller(name: string) {
    const current = form.installers ?? [];
    set("installers", current.includes(name) ? current.filter((m) => m !== name) : [...current, name]);
  }

  // Auto-populate client/address from linked project
  function handleProjectChange(projectId: string) {
    set("project_id", projectId);
    if (projectId) {
      const proj = projects.find((p) => p.id === projectId);
      if (proj) {
        if (!form.client_name) set("client_name", proj.client_name);
        if (!form.site_address) set("site_address", proj.site_address ?? "");
        if (!form.suburb) set("suburb", proj.location ?? "");
      }
    }
  }

  async function handleSubmit(e: React.FormEvent, notify = false) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    // Clash detection
    if (!form.date_tbc && form.scheduled_date && (form.installers ?? []).length > 0) {
      const newStart = new Date(form.scheduled_date);
      const newEnd = form.scheduled_end_date ? new Date(form.scheduled_end_date) : new Date(form.scheduled_date);
      newStart.setHours(0, 0, 0, 0);
      newEnd.setHours(23, 59, 59, 999);
      const clashes = allInstallations.filter((other) => {
        if (!other.scheduled_date || other.date_tbc) return false;
        const otherStart = new Date(other.scheduled_date);
        const otherEnd = other.scheduled_end_date ? new Date(other.scheduled_end_date) : new Date(other.scheduled_date);
        otherStart.setHours(0, 0, 0, 0);
        otherEnd.setHours(23, 59, 59, 999);
        const overlaps = !(otherEnd < newStart || otherStart > newEnd);
        if (!overlaps) return false;
        return (other.installers ?? []).some((name) => form.installers!.includes(name));
      });
      if (clashes.length > 0) {
        const names = clashes.map((c) => c.title).join(", ");
        toast({
          title: `⚠️ Installer clash detected — overlaps with: ${names}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const payload: NewInstallationInput = {
        ...form,
        project_id: form.project_id || undefined,
        client_name: form.client_name || undefined,
        site_address: form.site_address || undefined,
        suburb: form.suburb || undefined,
        scheduled_date: (!form.date_tbc && form.scheduled_date) ? form.scheduled_date : undefined,
        scheduled_end_date: (!form.date_tbc && form.scheduled_end_date) ? form.scheduled_end_date : undefined,
        scheduled_time_start: form.scheduled_time_start || undefined,
        scheduled_time_end: form.scheduled_time_end || undefined,
        site_inspection_date: form.site_inspection_date || undefined,
        site_inspection_owner: form.site_inspection_owner || undefined,
        notes: form.notes || undefined,
        owner: form.owner || undefined,
      };
      const created = await create.mutateAsync(payload);
      if (notify && !form.date_tbc && form.scheduled_date && (form.installers ?? []).length > 0) {
        const { supabase } = await import("@/lib/supabase");
        const { error } = await supabase.functions.invoke("notify-installers", {
          body: { installation_id: created.id },
        });
        if (error) {
          toast({ title: "Installation created — WhatsApp failed to send", variant: "destructive" });
        } else {
          toast({ title: "Installation created & installers notified" });
        }
      } else {
        toast({ title: "Installation created" });
      }
      setForm({ ...empty });
      onCreated?.(created.id);
      onClose();
    } catch {
      toast({ title: "Failed to create installation", variant: "destructive" });
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-50" />
          <motion.div key="dialog" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[580px] max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100 shrink-0">
                <h2 className="text-base font-semibold text-gray-900">New Installation</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
                {/* Title */}
                <Field label="Title *">
                  <input type="text" required value={form.title} onChange={(e) => set("title", e.target.value)}
                    placeholder="e.g. Neovision Century Village" className={inputClass} />
                </Field>

                {/* Linked project */}
                <Field label="Linked Project (optional)">
                  <select value={form.project_id ?? ""} onChange={(e) => handleProjectChange(e.target.value)} className={inputClass}>
                    <option value="">— Standalone installation —</option>
                    {projects.filter((p) => p.status !== "completed").map((p) => (
                      <option key={p.id} value={p.id}>{p.project_code} · {p.name}</option>
                    ))}
                  </select>
                </Field>

                {/* Priority */}
                <Field label="Priority">
                  <div className="flex gap-2">
                    {(["high","medium","low"] as InstallationPriority[]).map((p) => (
                      <button key={p} type="button" onClick={() => set("priority", p)}
                        className={`flex-1 py-2 text-xs rounded-lg border capitalize transition-colors ${
                          form.priority === p ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}>{p}</button>
                    ))}
                  </div>
                </Field>

                <hr className="border-gray-100" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Schedule</p>

                {/* Date TBC toggle */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set("date_tbc", !form.date_tbc)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${form.date_tbc ? "bg-amber-400" : "bg-gray-200"}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.date_tbc ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                  <label className="text-sm text-gray-600 cursor-pointer shrink-0" onClick={() => set("date_tbc", !form.date_tbc)}>
                    Date TBC
                  </label>
                </div>

                {!form.date_tbc && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start Date">
                      <input type="date" value={form.scheduled_date ?? ""} onChange={(e) => set("scheduled_date", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="End Date">
                      <input type="date" value={form.scheduled_end_date ?? ""} min={form.scheduled_date || undefined} onChange={(e) => set("scheduled_end_date", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Start Time">
                      <input type="time" value={form.scheduled_time_start ?? ""} onChange={(e) => set("scheduled_time_start", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="End Time">
                      <input type="time" value={form.scheduled_time_end ?? ""} onChange={(e) => set("scheduled_time_end", e.target.value)} className={inputClass} />
                    </Field>
                  </div>
                )}

                <hr className="border-gray-100" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Owner</p>

                <Field label="Project Owner">
                  <select value={form.owner ?? ""} onChange={(e) => set("owner", e.target.value)} className={inputClass}>
                    <option value="">— Unassigned</option>
                    {OWNERS.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </Field>

                <hr className="border-gray-100" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Location & Client</p>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Client Name">
                    <input type="text" value={form.client_name ?? ""} onChange={(e) => set("client_name", e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Suburb">
                    <input type="text" value={form.suburb ?? ""} onChange={(e) => set("suburb", e.target.value)} placeholder="e.g. Woodstock" className={inputClass} />
                  </Field>
                </div>
                <Field label="Site Address">
                  <input type="text" value={form.site_address ?? ""} onChange={(e) => set("site_address", e.target.value)} className={inputClass} />
                </Field>

                <hr className="border-gray-100" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Installers</p>

                <div className="flex flex-wrap gap-2">
                  {INSTALLERS.map((name) => {
                    const active = (form.installers ?? []).includes(name);
                    return (
                      <button key={name} type="button" onClick={() => toggleInstaller(name)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          active ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}>{name}</button>
                    );
                  })}
                </div>

                <hr className="border-gray-100" />
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Site Inspection</p>

                {/* Site inspection */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => set("site_inspection_required", !form.site_inspection_required)}
                    className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${form.site_inspection_required ? "bg-gray-900" : "bg-gray-200"}`}>
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.site_inspection_required ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                  <label className="text-sm text-gray-600 cursor-pointer shrink-0" onClick={() => set("site_inspection_required", !form.site_inspection_required)}>
                    Site inspection required
                  </label>
                </div>

                {form.site_inspection_required && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Inspection Date">
                      <input type="date" value={form.site_inspection_date ?? ""} onChange={(e) => set("site_inspection_date", e.target.value)} className={inputClass} />
                    </Field>
                    <Field label="Inspector">
                      <select value={form.site_inspection_owner ?? ""} onChange={(e) => set("site_inspection_owner", e.target.value)} className={inputClass}>
                        <option value="">Select…</option>
                        {SITE_INSPECTORS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </Field>
                  </div>
                )}

                {/* Notes */}
                <Field label="Notes">
                  <textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} className={`${inputClass} resize-none`} />
                </Field>

                <div className="flex gap-3 pt-2 pb-2">
                  <button type="button" onClick={onClose} className="flex-1 text-sm py-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={create.isPending}
                    className="flex-1 text-sm py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors disabled:opacity-40">
                    {create.isPending ? "Creating…" : "+ Add Installation"}
                  </button>
                </div>
                {!form.date_tbc && form.scheduled_date && (form.installers ?? []).length > 0 && (
                  <button
                    type="button"
                    disabled={create.isPending}
                    onClick={(e) => handleSubmit(e as unknown as React.FormEvent, true)}
                    className="w-full text-sm py-2.5 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors disabled:opacity-40">
                    {create.isPending ? "Creating…" : "Create & Notify Installers"}
                  </button>
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
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
