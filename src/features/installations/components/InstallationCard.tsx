import { motion } from "framer-motion";
import type { Installation } from "@/hooks/useInstallations";
import { useUpdateInstallation } from "@/hooks/useInstallations";
import { getInstallationStage, INSTALLATION_STAGE_ORDER, PRIORITY_CONFIG, installerColor, installerInitials } from "../lib/stages";
import type { InstallationStatus } from "../lib/stages";
import { CalendarDays, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, UserCircle } from "lucide-react";

interface InstallationCardProps {
  installation: Installation;
  onClick: (installation: Installation) => void;
}

function isConfirmed(inst: Installation): boolean {
  if (inst.date_tbc || !inst.scheduled_date) return false;
  if (!inst.installers?.length) return false;
  if (inst.site_inspection_required && !inst.site_inspection_done) return false;
  return true;
}

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" });

const fmtTime = (t: string | null) => t ? t.slice(0, 5) : null;

export function InstallationCard({ installation: inst, onClick }: InstallationCardProps) {
  const stage = getInstallationStage(inst.status);
  const priority = PRIORITY_CONFIG[inst.priority];
  const confirmed = isConfirmed(inst);
  const openSnags = (inst.snags ?? []).filter((s) => !s.resolved);
  const hasRemedial = openSnags.length > 0 && inst.status === "completed";

  const update = useUpdateInstallation();
  const currentIdx = INSTALLATION_STAGE_ORDER.indexOf(inst.status);
  const prevStatus = currentIdx > 0 ? INSTALLATION_STAGE_ORDER[currentIdx - 1] : null;
  const nextStatus = currentIdx < INSTALLATION_STAGE_ORDER.length - 1 ? INSTALLATION_STAGE_ORDER[currentIdx + 1] : null;

  const isUnscheduled = inst.status === "scheduled" && (inst.date_tbc || !inst.scheduled_date);
  const displayLabel = isUnscheduled ? "Unscheduled" : stage.label;
  const displayColor = isUnscheduled ? "bg-gray-100 text-gray-500" : `${stage.color} ${stage.textColor}`;

  function changeStage(e: React.MouseEvent, status: InstallationStatus) {
    e.stopPropagation();
    update.mutate({ id: inst.id, data: { status } });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onClick(inst)}
      className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all select-none"
    >
      {/* Top row: priority + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${priority.color} ${priority.textColor}`}>
          {priority.label}
        </span>
        <div className="flex items-center gap-1.5">
          {confirmed && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700">
              Confirmed
            </span>
          )}
          {hasRemedial && (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">
              <AlertTriangle className="w-2.5 h-2.5" />Remedial
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-1">{inst.title}</p>

      {/* Client / suburb */}
      {(inst.client_name || inst.suburb) && (
        <p className="text-xs text-gray-400 mb-3 truncate">
          {[inst.client_name, inst.suburb].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Date + time */}
      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
        <CalendarDays className="w-3 h-3 shrink-0" />
        {inst.date_tbc ? (
          <span className="text-amber-500 font-medium">Date TBC</span>
        ) : inst.scheduled_date ? (
          <span>
            {fmtDate(inst.scheduled_date)}
            {fmtTime(inst.scheduled_time_start) && ` · ${fmtTime(inst.scheduled_time_start)}`}
            {fmtTime(inst.scheduled_time_end) && `–${fmtTime(inst.scheduled_time_end)}`}
          </span>
        ) : (
          <span className="text-amber-500 font-medium">Unscheduled</span>
        )}
      </div>

      {/* Installers */}
      {inst.installers && inst.installers.length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          {inst.installers.map((name) => {
            const c = installerColor(name);
            return (
              <span key={name} title={name}
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold ${c.bg} ${c.text}`}>
                {installerInitials(name)}
              </span>
            );
          })}
        </div>
      )}

      {/* Owner */}
      {inst.owner && (
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
          <UserCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{inst.owner}</span>
        </div>
      )}

      {/* Site inspection pill */}
      {inst.site_inspection_required && (
        <div className={`mt-2.5 flex items-center gap-1 text-[10px] font-medium ${inst.site_inspection_done ? "text-emerald-600" : "text-slate-400"}`}>
          <CheckCircle2 className="w-3 h-3" />
          {inst.site_inspection_done ? "Inspection done" : "Inspection pending"}
        </div>
      )}

      {/* Stage nav */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <button
          onClick={(e) => prevStatus && changeStage(e, prevStatus)}
          disabled={!prevStatus || update.isPending}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors px-1 py-0.5 rounded"
        >
          <ChevronLeft className="w-3 h-3" />
          {prevStatus ? getInstallationStage(prevStatus).label : ""}
        </button>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${displayColor}`}>
          {displayLabel}
        </span>
        <button
          onClick={(e) => nextStatus && changeStage(e, nextStatus)}
          disabled={!nextStatus || update.isPending}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors px-1 py-0.5 rounded"
        >
          {nextStatus ? getInstallationStage(nextStatus).label : ""}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}
