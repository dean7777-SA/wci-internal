import { useMemo, useState } from "react";
import type { Installation } from "@/hooks/useInstallations";
import { getInstallationStage, INSTALLERS, INSTALLATION_STAGES } from "../lib/stages";

// ── Capacity helpers ─────────────────────────────────────────

/** Count Mon–Fri days in a given month. */
function getWorkingDaysInMonth(year: number, month: number): number {
  let count = 0;
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** Count distinct Mon–Fri dates where an installer is booked within [from, to]. */
function getBookedWorkingDays(
  installations: Installation[],
  installerName: string,
  from: Date,
  to: Date,
): number {
  const bookedSet = new Set<string>();
  for (const inst of installations) {
    if (!(inst.installers ?? []).includes(installerName)) continue;
    if (!inst.scheduled_date || inst.date_tbc) continue;
    const start = new Date(inst.scheduled_date + "T00:00:00");
    const end = inst.scheduled_end_date
      ? new Date(inst.scheduled_end_date + "T00:00:00")
      : start;
    const cursor = new Date(start);
    while (cursor <= end) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6 && cursor >= from && cursor <= to) {
        bookedSet.add(cursor.toDateString());
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return bookedSet.size;
}

interface DashboardViewProps {
  installations: Installation[];
  onCardClick: (installation: Installation) => void;
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Working hours: 8am–5pm = 9 hrs/day, 5 days/week
const HOURS_PER_DAY = 9;

function isOverdue(inst: Installation): boolean {
  if (inst.status === "completed" || inst.status === "signed_off") return false;
  if (!inst.scheduled_date || inst.date_tbc) return false;
  const d = new Date(inst.scheduled_date + "T00:00:00");
  return d < new Date(new Date().toDateString());
}

function isSiteInspectionMissing(inst: Installation): boolean {
  return inst.site_inspection_required && !inst.site_inspection_done &&
    inst.status !== "completed" && inst.status !== "signed_off";
}

function hasRemedial(inst: Installation): boolean {
  return inst.status === "completed" && (inst.snags ?? []).some((s) => !s.resolved);
}

export function DashboardView({ installations, onCardClick }: DashboardViewProps) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [capacityView, setCapacityView] = useState(false);
  const [weekFilter, setWeekFilter] = useState<"all" | typeof INSTALLERS[number]>("all");

  const stats = useMemo(() => {
    // Monthly overview for last 4 months + current
    const months: { label: string; scheduled: number; in_progress: number; completed: number; signed_off: number }[] = [];
    for (let i = -2; i <= 2; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
      const inMonth = installations.filter((inst) => {
        if (!inst.scheduled_date) return false;
        const dd = new Date(inst.scheduled_date + "T00:00:00");
        return dd.getMonth() === d.getMonth() && dd.getFullYear() === d.getFullYear();
      });
      months.push({
        label,
        scheduled: inMonth.filter((i) => i.status === "scheduled").length,
        in_progress: inMonth.filter((i) => i.status === "in_progress").length,
        completed: inMonth.filter((i) => i.status === "completed").length,
        signed_off: inMonth.filter((i) => i.status === "signed_off").length,
      });
    }

    // This week
    const todayDate = new Date(); todayDate.setHours(0,0,0,0);
    const weekEnd = new Date(todayDate); weekEnd.setDate(weekEnd.getDate() + 7);
    const thisWeek = installations.filter((inst) => {
      if (!inst.scheduled_date || inst.date_tbc) return false;
      const d = new Date(inst.scheduled_date + "T00:00:00");
      return d >= todayDate && d <= weekEnd;
    });

    // Flags
    const flagged = installations.filter((inst) => isOverdue(inst) || isSiteInspectionMissing(inst) || hasRemedial(inst));

    // Priority
    const highCount = installations.filter((i) => i.priority === "high" && i.status !== "signed_off").length;
    const medCount = installations.filter((i) => i.priority === "medium" && i.status !== "signed_off").length;
    const lowCount = installations.filter((i) => i.priority === "low" && i.status !== "signed_off").length;

    // Installer workload + capacity (this month)
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0);
    const todayForWeek = new Date(); todayForWeek.setHours(0, 0, 0, 0);
    const weekEndForCap = new Date(todayForWeek); weekEndForCap.setDate(weekEndForCap.getDate() + 4);

    const monthCapacityDays = getWorkingDaysInMonth(currentYear, currentMonth);
    const weekCapacityDays = 5;

    const installerLoad = INSTALLERS.map((name) => {
      const monthJobs = installations.filter((inst) => {
        if (!inst.scheduled_date) return false;
        const dd = new Date(inst.scheduled_date + "T00:00:00");
        return dd.getMonth() === currentMonth && dd.getFullYear() === currentYear &&
          (inst.installers ?? []).includes(name);
      }).length;

      const monthBookedDays = getBookedWorkingDays(installations, name, monthStart, monthEnd);
      const weekBookedDays = getBookedWorkingDays(installations, name, todayForWeek, weekEndForCap);

      return {
        name,
        count: monthJobs,
        monthBookedDays,
        monthCapacity: monthCapacityDays,
        monthAvailable: Math.max(0, monthCapacityDays - monthBookedDays),
        monthLoadPct: monthCapacityDays > 0 ? Math.min(100, Math.round((monthBookedDays / monthCapacityDays) * 100)) : 0,
        weekBookedDays,
        weekCapacity: weekCapacityDays,
        weekAvailable: Math.max(0, weekCapacityDays - weekBookedDays),
        hoursPerDay: HOURS_PER_DAY,
      };
    });

    return { months, thisWeek, flagged, highCount, medCount, lowCount, installerLoad };
  }, [installations]);

  return (
    <div className="space-y-8">

      {/* ── Installer Capacity ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Installer Capacity — {MONTH_NAMES[currentMonth]} {currentYear}
          </p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <button
              onClick={() => setCapacityView(false)}
              className={`px-3 py-1 font-medium transition-colors ${!capacityView ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              Jobs
            </button>
            <button
              onClick={() => setCapacityView(true)}
              className={`px-3 py-1 font-medium transition-colors ${capacityView ? "bg-gray-900 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              Capacity
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.installerLoad.map(({ name, count, monthBookedDays, monthCapacity, monthAvailable, monthLoadPct, weekBookedDays, weekCapacity, weekAvailable }) => (
            <div key={name} className="bg-white border border-gray-200 rounded-xl px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-900">{name}</span>
                {!capacityView && (
                  <span className={`text-2xl font-bold tabular-nums ${count > 0 ? "text-gray-900" : "text-gray-200"}`}>{count || "0"}</span>
                )}
                {capacityView && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    monthLoadPct >= 90 ? "bg-red-100 text-red-700" :
                    monthLoadPct >= 70 ? "bg-amber-100 text-amber-700" :
                    "bg-emerald-100 text-emerald-700"
                  }`}>{monthLoadPct}% booked</span>
                )}
              </div>

              {capacityView ? (
                <>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${monthLoadPct >= 90 ? "bg-red-400" : monthLoadPct >= 70 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${monthLoadPct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-3">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Month</p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{monthBookedDays}<span className="text-xs font-normal text-gray-400">/{monthCapacity} days</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Available</p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">{monthAvailable}<span className="text-xs font-normal text-gray-400"> days left</span></p>
                    </div>
                    <div className="col-span-2 mt-1 pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">This week</p>
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">
                        {weekBookedDays}<span className="text-xs font-normal text-gray-400">/{weekCapacity} days · </span>
                        <span className={`text-xs font-medium ${weekAvailable === 0 ? "text-red-500" : "text-emerald-600"}`}>{weekAvailable} free</span>
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">This month</p>
                    <p className="text-xs font-medium text-gray-600">{monthBookedDays} days booked</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">This week</p>
                    <p className="text-xs font-medium text-gray-600">{weekBookedDays}/{weekCapacity} days</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {INSTALLATION_STAGES.map((stage) => (
          <div key={stage.id} className={`border rounded-xl px-5 py-5 ${stage.color}`}>
            <p className={`text-xs uppercase tracking-wide mb-2 ${stage.textColor} opacity-70`}>{stage.label}</p>
            <p className={`text-3xl font-semibold leading-none ${stage.textColor}`}>
              {installations.filter((i) => i.status === stage.id).length}
            </p>
          </div>
        ))}
      </div>

      {/* This week */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            This Week ({stats.thisWeek.filter((inst) =>
              weekFilter === "all" || (inst.installers ?? []).includes(weekFilter)
            ).length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(["all", ...INSTALLERS] as const).map((f) => (
              <button
                key={f}
                onClick={() => setWeekFilter(f)}
                className={`text-xs px-3 py-0.5 rounded-full border font-medium transition-colors ${
                  weekFilter === f
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const filtered = stats.thisWeek.filter((inst) =>
            weekFilter === "all" || (inst.installers ?? []).includes(weekFilter)
          );
          return filtered.length === 0 ? (
            <div className="border border-dashed border-gray-200 rounded-xl py-8 text-center text-sm text-gray-400">No installations this week</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((inst) => {
                const stage = getInstallationStage(inst.status);
                return (
                  <button key={inst.id} onClick={() => onCardClick(inst)}
                    className="text-left p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-2 h-2 rounded-full ${stage.dotColor}`} />
                      <span className="text-xs text-gray-400">
                        {inst.scheduled_date && new Date(inst.scheduled_date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">{inst.title}</p>
                    {inst.installers?.length ? <p className="text-xs text-gray-400 mt-0.5">{inst.installers.join(", ")}</p> : null}
                  </button>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly overview */}
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Monthly Overview</p>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Month</th>
                  {["Scheduled","In Progress","Completed","Signed Off"].map((h) => (
                    <th key={h} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.months.map((row, i) => {
                  const isCurrent = i === 2;
                  return (
                    <tr key={row.label} className={`border-b border-gray-50 last:border-0 ${isCurrent ? "bg-blue-50/40" : ""}`}>
                      <td className={`px-4 py-3 text-sm ${isCurrent ? "font-semibold text-gray-900" : "text-gray-500"}`}>{row.label}</td>
                      <td className="text-center px-3 py-3 text-sm text-gray-500">{row.scheduled || "—"}</td>
                      <td className="text-center px-3 py-3 text-sm text-gray-500">{row.in_progress || "—"}</td>
                      <td className="text-center px-3 py-3 text-sm text-gray-500">{row.completed || "—"}</td>
                      <td className="text-center px-3 py-3 text-sm text-gray-500">{row.signed_off || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Priority breakdown */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Priority Breakdown</p>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {[
              { label: "High", count: stats.highCount, color: "bg-red-100", text: "text-red-700" },
              { label: "Medium", count: stats.medCount, color: "bg-amber-100", text: "text-amber-700" },
              { label: "Low", count: stats.lowCount, color: "bg-green-100", text: "text-green-700" },
            ].map(({ label, count, color, text }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${color} ${text}`}>{label}</span>
                <span className="text-sm font-semibold text-gray-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flagged items */}
      {stats.flagged.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-orange-100 bg-orange-50">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
              Flagged Items ({stats.flagged.length})
            </p>
          </div>
          <div className="overflow-y-auto max-h-64 divide-y divide-orange-50">
            {stats.flagged.map((inst) => {
              const reasons: string[] = [];
              if (isOverdue(inst)) reasons.push("Overdue");
              if (isSiteInspectionMissing(inst)) reasons.push("Inspection pending");
              if (hasRemedial(inst)) reasons.push("Remedial required");
              return (
                <button key={inst.id} onClick={() => onCardClick(inst)}
                  className="w-full text-left flex items-center gap-4 px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{inst.title}</p>
                    {inst.client_name && <p className="text-xs text-gray-500">{inst.client_name}</p>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 shrink-0">
                    {reasons.map((r) => (
                      <span key={r} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-200 text-orange-800 font-medium">{r}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
