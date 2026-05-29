import { useState } from "react";
import { X, Plus, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCompleteInstallation } from "@/hooks/useInstallations";
import { useToast } from "@/hooks/use-toast";

interface CompletionModalProps {
  installationId: string;
  installationTitle: string;
  onClose: () => void;
  onCompleted: () => void;
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300 bg-white";

export function CompletionModal({ installationId, installationTitle, onClose, onCompleted }: CompletionModalProps) {
  const [installerNotes, setInstallerNotes] = useState("");
  const [actualHours, setActualHours] = useState("");
  const [actualMins, setActualMins] = useState("");
  const [signoffName, setSignoffName] = useState("");
  const [signoffDate, setSignoffDate] = useState(new Date().toISOString().slice(0, 10));
  const [snags, setSnags] = useState<string[]>([]);
  const [newSnag, setNewSnag] = useState("");

  const complete = useCompleteInstallation();
  const { toast } = useToast();

  function addSnag() {
    const trimmed = newSnag.trim();
    if (trimmed) { setSnags((s) => [...s, trimmed]); setNewSnag(""); }
  }

  function removeSnag(i: number) {
    setSnags((s) => s.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const durationMins = (parseInt(actualHours || "0") * 60) + parseInt(actualMins || "0");
    try {
      await complete.mutateAsync({
        installationId,
        installer_notes: installerNotes || undefined,
        actual_duration_mins: durationMins || undefined,
        client_signoff_name: signoffName || undefined,
        client_signoff_date: signoffDate || undefined,
      });
      // Snags are added separately via the detail panel after completion
      // but we pre-create them here if entered
      if (snags.length) {
        const { supabase } = await import("@/lib/supabase");
        await supabase.from("installation_snags").insert(
          snags.map((d) => ({ installation_id: installationId, description: d }))
        );
      }
      toast({ title: snags.length ? "Marked complete — remedial items added" : "Installation marked complete" });
      onCompleted();
    } catch {
      toast({ title: "Failed to complete installation", variant: "destructive" });
    }
  }

  return (
    <AnimatePresence>
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[60]" onClick={onClose} />
      <motion.div key="modal" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Mark as Completed</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[340px]">{installationTitle}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Actual time */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Actual Time Taken</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" min="0" value={actualHours} onChange={(e) => setActualHours(e.target.value)}
                    placeholder="0" className={inputClass} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">hrs</span>
                </div>
                <div className="relative flex-1">
                  <input type="number" min="0" max="59" value={actualMins} onChange={(e) => setActualMins(e.target.value)}
                    placeholder="0" className={inputClass} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">mins</span>
                </div>
              </div>
            </div>

            {/* Installer notes */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Installer Notes</label>
              <textarea value={installerNotes} onChange={(e) => setInstallerNotes(e.target.value)}
                rows={3} placeholder="What went well, lessons learned…" className={`${inputClass} resize-none`} />
            </div>

            {/* Client sign-off */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Client Sign-off (optional)</label>
              <div className="flex gap-2">
                <input type="text" value={signoffName} onChange={(e) => setSignoffName(e.target.value)}
                  placeholder="Client name" className={`${inputClass} flex-1`} />
                <input type="date" value={signoffDate} onChange={(e) => setSignoffDate(e.target.value)}
                  className={`${inputClass} w-40`} />
              </div>
            </div>

            {/* Snags */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Snags / Remedial Work <span className="text-gray-300">(optional)</span></label>
              {snags.length > 0 && (
                <ul className="mb-2 space-y-1.5">
                  {snags.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 bg-orange-50 rounded-lg px-3 py-2 text-sm text-orange-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                      <span className="flex-1">{s}</span>
                      <button type="button" onClick={() => removeSnag(i)} className="text-orange-300 hover:text-orange-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2">
                <input type="text" value={newSnag} onChange={(e) => setNewSnag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSnag(); } }}
                  placeholder="Describe a snag item…" className={`${inputClass} flex-1`} />
                <button type="button" onClick={addSnag} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {snags.length > 0 && (
                <p className="text-[11px] text-orange-500 mt-1.5">Card will be flagged Remedial Required until all snags are resolved.</p>
              )}
            </div>

            <div className="flex gap-3 pt-1 pb-2">
              <button type="button" onClick={onClose} className="flex-1 text-sm py-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={complete.isPending}
                className="flex-1 text-sm py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-40">
                {complete.isPending ? "Saving…" : "Mark Complete"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
