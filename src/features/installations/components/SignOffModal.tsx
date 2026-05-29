import { useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSignOffInstallation } from "@/hooks/useInstallations";
import { useToast } from "@/hooks/use-toast";

interface SignOffModalProps {
  installationId: string;
  installationTitle: string;
  onClose: () => void;
  onSignedOff: () => void;
}

const inputClass = "w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-gray-300 bg-white";

export function SignOffModal({ installationId, installationTitle, onClose, onSignedOff }: SignOffModalProps) {
  const [signedBy, setSignedBy] = useState("");
  const [signedAt, setSignedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const signOff = useSignOffInstallation();
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!signedBy.trim()) {
      toast({ title: "Signed-by name is required", variant: "destructive" });
      return;
    }
    try {
      await signOff.mutateAsync({ installationId, signed_by: signedBy, signed_at: signedAt, notes: notes || undefined });
      toast({ title: "Installation signed off" });
      onSignedOff();
    } catch {
      toast({ title: "Failed to sign off", variant: "destructive" });
    }
  }

  return (
    <AnimatePresence>
      <motion.div key="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-[60]" onClick={onClose} />
      <motion.div key="modal" initial={{ opacity: 0, scale: 0.97, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Client Sign-Off</h2>
              <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[300px]">{installationTitle}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Signed Off By *</label>
              <input type="text" required value={signedBy} onChange={(e) => setSignedBy(e.target.value)}
                placeholder="Client or authorised name" className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Date *</label>
              <input type="date" required value={signedAt} onChange={(e) => setSignedAt(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Notes <span className="text-gray-300">(optional)</span></label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Any final remarks…" className={`${inputClass} resize-none`} />
            </div>
            <div className="flex gap-3 pt-1 pb-2">
              <button type="button" onClick={onClose} className="flex-1 text-sm py-2.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={signOff.isPending}
                className="flex-1 text-sm py-2.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-40">
                {signOff.isPending ? "Saving…" : "Sign Off"}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
