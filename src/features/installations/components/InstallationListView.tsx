import type { Installation } from "@/hooks/useInstallations";
import { getInstallationStage, PRIORITY_CONFIG, installerColor, installerInitials } from "../lib/stages";
import { CalendarDays, AlertTriangle } from "lucide-react";

interface InstallationListViewProps {
  installations: Installation[];
  onRowClick: (installation: Installation) => void;
}

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });

export function InstallationListView({ installations, onRowClick }: InstallationListViewProps) {
  if (installations.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-gray-400">
        No installations found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-4 pl-1 whitespace-nowrap">Title</th>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-4 whitespace-nowrap">Client</th>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-4 whitespace-nowrap">Date</th>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-4 whitespace-nowrap">Status</th>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-4 whitespace-nowrap">Priority</th>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-4 whitespace-nowrap">Installers</th>
            <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 pr-1 whitespace-nowrap">Owner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {installations.map((inst) => {
            const stage = getInstallationStage(inst.status);
            const priority = PRIORITY_CONFIG[inst.priority];
            const isUnscheduled = inst.status === "scheduled" && (inst.date_tbc || !inst.scheduled_date);
            const openSnags = (inst.snags ?? []).filter((s) => !s.resolved);
            const hasRemedial = openSnags.length > 0 && inst.status === "completed";

            return (
              <tr
                key={inst.id}
                onClick={() => onRowClick(inst)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Title */}
                <td className="py-3 pr-4 pl-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 whitespace-nowrap">{inst.title}</span>
                    {hasRemedial && <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />}
                  </div>
                  {inst.suburb && <p className="text-xs text-gray-400">{inst.suburb}</p>}
                </td>

                {/* Client */}
                <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                  {inst.client_name ?? <span className="text-gray-300">—</span>}
                </td>

                {/* Date */}
                <td className="py-3 pr-4 whitespace-nowrap">
                  {inst.date_tbc ? (
                    <span className="text-amber-500 text-xs font-medium">Date TBC</span>
                  ) : inst.scheduled_date ? (
                    <span className="flex items-center gap-1 text-gray-600 text-xs">
                      <CalendarDays className="w-3 h-3 shrink-0" />
                      {fmtDate(inst.scheduled_date)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="py-3 pr-4">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
                    isUnscheduled ? "bg-gray-100 text-gray-500" : `${stage.color} ${stage.textColor}`
                  }`}>
                    {isUnscheduled ? "Unscheduled" : stage.label}
                  </span>
                </td>

                {/* Priority */}
                <td className="py-3 pr-4">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${priority.color} ${priority.textColor}`}>
                    {priority.label}
                  </span>
                </td>

                {/* Installers */}
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    {inst.installers && inst.installers.length > 0 ? (
                      inst.installers.map((name) => {
                        const c = installerColor(name);
                        return (
                          <span key={name} title={name}
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${c.bg} ${c.text}`}>
                            {installerInitials(name)}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>
                </td>

                {/* Owner */}
                <td className="py-3 pr-1 text-gray-500 text-xs whitespace-nowrap">
                  {inst.owner ?? <span className="text-gray-300">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
