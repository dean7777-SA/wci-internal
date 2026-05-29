import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCircle2, Circle, AlertTriangle, ChevronRight,
  CalendarDays, MapPin, Users, ClipboardList, PackageOpen, FileText,
} from "lucide-react";
import type { Installation } from "@/hooks/useInstallations";
import {
  useUpdateInstallation, useUpdateInstallers, useDeleteInstallation,
  useResolveSnag, useAddSnag,
} from "@/hooks/useInstallations";
import { getInstallationStage, PRIORITY_CONFIG, INSTALLERS, PRE_INSTALL_CHECKLIST } from "../lib/stages";
import { useToast } from "@/hooks/use-toast";
import { CompletionModal } from "./CompletionModal";
import { SignOffModal } from "./SignOffModal";

interface InstallationDetailPanelProps {
  installation: Installation;
  allInstallations: Installation[];
  onClose: () => void;
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300 bg-white";

type PanelTab = "details" | "checklist" | "snags";

export function InstallationDetailPanel({ installation: inst, allInstallations, onClose }: InstallationDetailPanelProps) {
  // Use live data from allInstallations so the panel reflects mutations
  const live = allInstallations.find((i) => i.id === inst.id) ?? inst;
  const [tab, setTab] = useState<PanelTab>("details");
  const [showCompletion, setShowCompletion] = useState(false);
  const [showSignOff, setShowSignOff] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newSnag, setNewSnag] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    scheduled_date: inst.scheduled_date ?? "",
    scheduled_end_date: inst.scheduled_end_date ?? "",
    scheduled_time_start: inst.scheduled_time_start ?? "",
    scheduled_time_end: inst.scheduled_time_end ?? "",
  });
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const update = useUpdateInstallation();
  const updateInstallers = useUpdateInstallers();
  const deleteInst = useDeleteInstallation();
  const resolveSnag = useResolveSnag();
  const addSnag = useAddSnag();
  const { toast } = useToast();

  const stage = getInstallationStage(live.status);
  const priority = PRIORITY_CONFIG[live.priority];
  const openSnags = (live.snags ?? []).filter((s) => !s.resolved);
  const hasRemedial = openSnags.length > 0 && live.status === "completed";
  const allSnagsDone = openSnags.length === 0 && live.status === "completed" && (live.snags ?? []).length > 0;
  const canSignOff = live.status === "completed" && openSnags.length === 0;

  async function handleSaveSchedule() {
    if (!scheduleForm.scheduled_date) {
      toast({ title: "Please set a start date", variant: "destructive" });
      return;
    }

    // Clash detection — check if any assigned installer is already booked
    if (live.installers && live.installers.length > 0) {
      const newStart = new Date(scheduleForm.scheduled_date);
      const newEnd = scheduleForm.scheduled_end_date
        ? new Date(scheduleForm.scheduled_end_date)
        : newStart;
      newStart.setHours(0, 0, 0, 0);
      newEnd.setHours(23, 59, 59, 999);

      const clashes = allInstallations.filter((other) => {
        if (other.id === live.id) return false;
        if (!other.scheduled_date || other.date_tbc) return false;
        const otherStart = new Date(other.scheduled_date);
        const otherEnd = other.scheduled_end_date ? new Date(other.scheduled_end_date) : new Date(other.scheduled_date);
        otherStart.setHours(0, 0, 0, 0);
        otherEnd.setHours(23, 59, 59, 999);
        // Overlaps if not (otherEnd < newStart || otherStart > newEnd)
        const overlaps = !(otherEnd < newStart || otherStart > newEnd);
        if (!overlaps) return false;
        // Check if any installer is shared
        return (other.installers ?? []).some((name) => live.installers!.includes(name));
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

    setScheduleSaving(true);
    try {
      await update.mutateAsync({
        id: live.id,
        data: {
          scheduled_date: scheduleForm.scheduled_date,
          scheduled_end_date: scheduleForm.scheduled_end_date || undefined,
          scheduled_time_start: scheduleForm.scheduled_time_start || undefined,
          scheduled_time_end: scheduleForm.scheduled_time_end || undefined,
          date_tbc: false,
        },
      });
      // Fire WhatsApp notifications to assigned installers
      const { error } = await import("@/lib/supabase").then(async ({ supabase }) => {
        const res = await supabase.functions.invoke("notify-installers", {
          body: { installation_id: live.id },
        });
        return res;
      });
      if (error) {
        toast({ title: "Schedule saved — WhatsApp failed to send", variant: "destructive" });
      } else {
        toast({ title: "Schedule saved & installers notified" });
      }
    } catch {
      toast({ title: "Failed to save schedule", variant: "destructive" });
    } finally {
      setScheduleSaving(false);
    }
  }

  async function toggleChecklistItem(key: string, current: boolean) {
    await update.mutateAsync({ id: live.id, data: { [key]: !current } as any });
  }

  async function toggleInspectionDone() {
    await update.mutateAsync({ id: live.id, data: { site_inspection_done: !live.site_inspection_done } });
  }

  async function toggleInstaller(name: string) {
    const current = live.installers ?? [];
    const next = current.includes(name) ? current.filter((m) => m !== name) : [...current, name];
    await updateInstallers.mutateAsync({ installationId: live.id, installers: next });
  }

  async function handleResolveSnag(snagId: string) {
    await resolveSnag.mutateAsync(snagId);
  }

  async function handleAddSnag() {
    const trimmed = newSnag.trim();
    if (!trimmed) return;
    await addSnag.mutateAsync({ installationId: live.id, description: trimmed });
    setNewSnag("");
  }

  async function handleDelete() {
    await deleteInst.mutateAsync(live.id);
    toast({ title: "Installation deleted" });
    onClose();
  }

  const fmtDate = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40" />

      {/* Panel */}
      <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="fixed right-0 top-0 bottom-0 w-full max-w-[520px] bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Installation</p>
              <h2 className="text-base font-semibold text-gray-900 leading-snug">{live.title}</h2>
              {(live.client_name || live.suburb) && (
                <p className="text-xs text-gray-400 mt-0.5">{[live.client_name, live.suburb].filter(Boolean).join(" · ")}</p>
              )}
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status + priority badges */}
          {(() => {
            const isUnscheduled = live.status === "scheduled" && (live.date_tbc || !live.scheduled_date);
            const statusLabel = isUnscheduled ? "Unscheduled" : stage.label;
            const statusColor = isUnscheduled ? "bg-gray-100 text-gray-500" : `${stage.color} ${stage.textColor}`;
            return (
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium ${priority.color} ${priority.textColor}`}>
                  {priority.label}
                </span>
                {hasRemedial && (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                    <AlertTriangle className="w-2.5 h-2.5" />Remedial Required
                  </span>
                )}
              </div>
            );
          })()}

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            {live.status === "scheduled" && (
              <button onClick={() => update.mutateAsync({ id: live.id, data: { status: "in_progress" } })}
                className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors">
                → In Progress
              </button>
            )}
            {live.status === "in_progress" && (
              <button onClick={() => setShowCompletion(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
                Mark Complete
              </button>
            )}
            {canSignOff && live.status === "completed" && (
              <button onClick={() => setShowSignOff(true)}
                className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                Sign Off →
              </button>
            )}
          </div>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-gray-100 shrink-0">
          {([
            { id: "details" as PanelTab, label: "Details", icon: FileText },
            { id: "checklist" as PanelTab, label: "Checklist", icon: ClipboardList },
            { id: "snags" as PanelTab, label: `Snags${openSnags.length ? ` (${openSnags.length})` : ""}`, icon: AlertTriangle },
          ]).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-700"
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── DETAILS TAB ── */}
          {tab === "details" && (
            <>
              {/* Date / time */}
              <Section icon={CalendarDays} label="Schedule">
                <div className="space-y-3">
                  {/* TBC toggle */}
                  <div className="flex items-center gap-3">
                    <button type="button"
                      onClick={() => update.mutateAsync({ id: live.id, data: { date_tbc: !live.date_tbc } })}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${live.date_tbc ? "bg-amber-400" : "bg-gray-200"}`}>
                      <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${live.date_tbc ? "translate-x-5" : "translate-x-0"}`} />
                    </button>
                    <span className="text-sm text-gray-600">Date TBC</span>
                  </div>
                  {/* Date + time inputs */}
                  {!live.date_tbc && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400">Start date</p>
                          <input type="date"
                            value={scheduleForm.scheduled_date}
                            onChange={(e) => setScheduleForm(f => ({ ...f, scheduled_date: e.target.value }))}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400">End date</p>
                          <input type="date"
                            value={scheduleForm.scheduled_end_date}
                            min={scheduleForm.scheduled_date || undefined}
                            onChange={(e) => setScheduleForm(f => ({ ...f, scheduled_end_date: e.target.value }))}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400">Start time</p>
                          <input type="time"
                            value={scheduleForm.scheduled_time_start}
                            onChange={(e) => setScheduleForm(f => ({ ...f, scheduled_time_start: e.target.value }))}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] text-gray-400">End time</p>
                          <input type="time"
                            value={scheduleForm.scheduled_time_end}
                            onChange={(e) => setScheduleForm(f => ({ ...f, scheduled_time_end: e.target.value }))}
                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300" />
                        </div>
                      </div>
                      <button
                        onClick={handleSaveSchedule}
                        disabled={scheduleSaving}
                        className="w-full text-xs px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors mt-1">
                        {scheduleSaving ? "Saving…" : "Save & Notify Installers"}
                      </button>
                    </div>
                  )}
                </div>
              </Section>

              {/* Location */}
              {(live.site_address || live.suburb) && (
                <Section icon={MapPin} label="Location">
                  <p className="text-sm text-gray-700">{[live.site_address, live.suburb].filter(Boolean).join(", ")}</p>
                </Section>
              )}

              {/* Installers */}
              <Section icon={Users} label="Installers">
                <div className="flex flex-wrap gap-1.5">
                  {INSTALLERS.map((name) => {
                    const active = (live.installers ?? []).includes(name);
                    return (
                      <button key={name} onClick={() => toggleInstaller(name)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          active ? "bg-gray-900 text-white border-gray-900" : "border-gray-200 text-gray-500 hover:border-gray-400"
                        }`}>
                        {name}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Site inspection */}
              {live.site_inspection_required && (
                <Section icon={CheckCircle2} label="Site Inspection">
                  <div className="space-y-2">
                    <button onClick={toggleInspectionDone}
                      className={`flex items-center gap-2 text-sm transition-colors ${live.site_inspection_done ? "text-emerald-600" : "text-gray-400 hover:text-gray-700"}`}>
                      {live.site_inspection_done
                        ? <CheckCircle2 className="w-4 h-4" />
                        : <Circle className="w-4 h-4" />}
                      {live.site_inspection_done ? "Inspection complete" : "Mark inspection done"}
                    </button>
                    {live.site_inspection_date && <p className="text-xs text-gray-400">{fmtDate(live.site_inspection_date)}{live.site_inspection_owner && ` · ${live.site_inspection_owner}`}</p>}
                    {live.site_inspection_notes && <p className="text-xs text-gray-500 italic">{live.site_inspection_notes}</p>}
                  </div>
                </Section>
              )}

              {/* Notes */}
              {live.notes && (
                <Section icon={FileText} label="Notes">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{live.notes}</p>
                </Section>
              )}

              {/* Completion record */}
              {live.completion && (
                <Section icon={CheckCircle2} label="Completion Record">
                  <div className="space-y-1 text-sm text-gray-600">
                    {live.completion.actual_duration_mins && (
                      <p>Duration: {Math.floor(live.completion.actual_duration_mins / 60)}h {live.completion.actual_duration_mins % 60}m</p>
                    )}
                    {live.completion.client_signoff_name && (
                      <p>Client: {live.completion.client_signoff_name}{live.completion.client_signoff_date && ` · ${fmtDate(live.completion.client_signoff_date)}`}</p>
                    )}
                    {live.completion.installer_notes && <p className="italic text-gray-400">{live.completion.installer_notes}</p>}
                  </div>
                </Section>
              )}

              {/* Sign-off record */}
              {live.signoff && (
                <Section icon={CheckCircle2} label="Sign-Off Record">
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Signed by: <span className="font-medium">{live.signoff.signed_by}</span> · {fmtDate(live.signoff.signed_at)}</p>
                    {live.signoff.notes && <p className="italic text-gray-400">{live.signoff.notes}</p>}
                  </div>
                </Section>
              )}

              {/* Delete */}
              <div className="pt-4 border-t border-gray-100">
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={deleteInst.isPending}
                      className="text-xs px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40">
                      {deleteInst.isPending ? "Deleting…" : "Confirm Delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-500">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 hover:text-red-600 transition-colors">
                    Delete installation
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── CHECKLIST TAB ── */}
          {tab === "checklist" && (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 mb-4">Pre-installation checklist — tick items off as they are confirmed.</p>
              {PRE_INSTALL_CHECKLIST.map(({ key, label }) => {
                const checked = live[key as keyof Installation] as boolean;
                return (
                  <button key={key} onClick={() => toggleChecklistItem(key, checked)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                      checked ? "border-emerald-200 bg-emerald-50" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    {checked
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      : <Circle className="w-5 h-5 text-gray-300 shrink-0" />}
                    <span className={`text-sm ${checked ? "text-emerald-700 line-through" : "text-gray-700"}`}>{label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── SNAGS TAB ── */}
          {tab === "snags" && (
            <div className="space-y-3">
              {(live.snags ?? []).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No snags recorded.</p>
              )}
              {(live.snags ?? []).map((snag) => (
                <div key={snag.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${snag.resolved ? "border-gray-100 bg-gray-50" : "border-orange-200 bg-orange-50"}`}>
                  <button onClick={() => !snag.resolved && handleResolveSnag(snag.id)} disabled={snag.resolved}
                    className="mt-0.5 shrink-0">
                    {snag.resolved
                      ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
                      : <Circle className="w-4.5 h-4.5 text-orange-400 hover:text-orange-600 transition-colors" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${snag.resolved ? "line-through text-gray-400" : "text-orange-800"}`}>{snag.description}</p>
                    {snag.resolved_at && (
                      <p className="text-[11px] text-gray-400 mt-0.5">Resolved {new Date(snag.resolved_at).toLocaleDateString("en-ZA")}</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Add snag */}
              {live.status !== "signed_off" && (
                <div className="flex gap-2 mt-4">
                  <input type="text" value={newSnag} onChange={(e) => setNewSnag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSnag(); } }}
                    placeholder="Add a snag item…" className={`${inputClass} flex-1`} />
                  <button onClick={handleAddSnag} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-xs">
                    Add
                  </button>
                </div>
              )}

              {canSignOff && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-emerald-600 mb-3">All snags resolved — ready to sign off.</p>
                  <button onClick={() => setShowSignOff(true)}
                    className="w-full text-sm py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                    Sign Off Installation
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Modals rendered outside the panel */}
      <AnimatePresence>
        {showCompletion && (
          <CompletionModal
            installationId={live.id}
            installationTitle={live.title}
            onClose={() => setShowCompletion(false)}
            onCompleted={() => setShowCompletion(false)}
          />
        )}
        {showSignOff && (
          <SignOffModal
            installationId={live.id}
            installationTitle={live.title}
            onClose={() => setShowSignOff(false)}
            onSignedOff={() => { setShowSignOff(false); onClose(); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function Section({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium">{label}</p>
      </div>
      {children}
    </div>
  );
}
