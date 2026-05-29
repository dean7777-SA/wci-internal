import { AnimatePresence } from "framer-motion";
import type { Installation } from "@/hooks/useInstallations";
import { INSTALLATION_STAGES } from "../lib/stages";
import { InstallationCard } from "./InstallationCard";

interface KanbanBoardProps {
  installations: Installation[];
  onCardClick: (installation: Installation) => void;
}

const UNSCHEDULED_COL = {
  id: "_unscheduled" as const,
  label: "Unscheduled",
  dotColor: "bg-gray-300",
};

function isUnscheduled(inst: Installation): boolean {
  return inst.status === "scheduled" && (inst.date_tbc || !inst.scheduled_date);
}

export function KanbanBoard({ installations, onCardClick }: KanbanBoardProps) {
  const unscheduled = installations.filter(isUnscheduled);

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-4 h-full min-w-max pb-4">
      {/* Unscheduled column */}
      <div className="w-[280px] shrink-0 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
          <span className={`w-2 h-2 rounded-full ${UNSCHEDULED_COL.dotColor}`} />
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{UNSCHEDULED_COL.label}</span>
          <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{unscheduled.length}</span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
          <AnimatePresence>
            {unscheduled.map((inst) => (
              <InstallationCard key={inst.id} installation={inst} onClick={onCardClick} />
            ))}
          </AnimatePresence>
          {unscheduled.length === 0 && (
            <div className="border-2 border-dashed border-gray-100 rounded-xl py-8 flex items-center justify-center">
              <p className="text-xs text-gray-300">No installations</p>
            </div>
          )}
        </div>
      </div>

      {/* Stage columns — filter TBC cards out of Scheduled */}
      {INSTALLATION_STAGES.map((stage) => {
        const cards = installations.filter((i) =>
          i.status === stage.id && !(stage.id === "scheduled" && isUnscheduled(i))
        );
        return (
          <div key={stage.id} className="w-[280px] shrink-0 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3 px-1 shrink-0">
              <span className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">{stage.label}</span>
              <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{cards.length}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1">
              <AnimatePresence>
                {cards.map((inst) => (
                  <InstallationCard key={inst.id} installation={inst} onClick={onCardClick} />
                ))}
              </AnimatePresence>
              {cards.length === 0 && (
                <div className="border-2 border-dashed border-gray-100 rounded-xl py-8 flex items-center justify-center">
                  <p className="text-xs text-gray-300">No installations</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}

