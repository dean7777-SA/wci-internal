import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Installation } from "@/hooks/useInstallations";
import { getInstallationStage, installerColor, installerInitials } from "../lib/stages";

interface CalendarViewProps {
  installations: Installation[];
  onChipClick: (installation: Installation) => void;
  showSiteInspections?: boolean;
}

type CalendarMode = "month" | "week" | "day";

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function installationDate(inst: Installation): Date | null {
  if (!inst.scheduled_date || inst.date_tbc) return null;
  return parseDate(inst.scheduled_date);
}

function installationEndDate(inst: Installation): Date | null {
  if (!inst.scheduled_end_date) return installationDate(inst);
  return parseDate(inst.scheduled_end_date);
}

const DAY_HEADERS     = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_HEADERS_MOB = ["M",   "T",   "W",   "T",   "F",   "S",   "S"  ];

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function SiteInspectionChip({ inst, onClick }: { inst: Installation; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={`SI: ${inst.title}`}
      className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 bg-violet-100 text-violet-800 hover:opacity-80 transition-opacity">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-bold shrink-0 bg-violet-600 text-white">SI</span>
      <span className="truncate">{inst.title}</span>
    </button>
  );
}

function InstallationChip({ inst, onClick }: { inst: Installation; onClick: () => void }) {
  const primaryInstaller = inst.installers?.[0];
  const c = primaryInstaller ? installerColor(primaryInstaller) : getInstallationStage(inst.status);
  const chipBg = primaryInstaller ? installerColor(primaryInstaller).chip : getInstallationStage(inst.status).chipColor;
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
      title={inst.title}
      className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${chipBg} text-gray-800 hover:opacity-80 transition-opacity`}>
      {primaryInstaller && (
        <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold shrink-0 ${installerColor(primaryInstaller).bg} ${installerColor(primaryInstaller).text}`}>
          {installerInitials(primaryInstaller)}
        </span>
      )}
      <span className="truncate">{inst.title}</span>
    </button>
  );
}

export function CalendarView({ installations, onChipClick, showSiteInspections = false }: CalendarViewProps) {
  const [mode, setMode] = useState<CalendarMode>("month");
  const [cursor, setCursor] = useState(new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Installations with a real date (non-TBC)
  const scheduled = installations.filter((i) => !i.date_tbc && i.scheduled_date);
  // Unscheduled (TBC or no date)
  const unscheduled = installations.filter((i) => i.date_tbc || !i.scheduled_date);

  function instForDay(d: Date): Installation[] {
    return scheduled.filter((i) => {
      const start = installationDate(i);
      if (!start) return false;
      const end = installationEndDate(i) ?? start;
      return d >= start && d <= end;
    });
  }

  function siteInspForDay(d: Date): Installation[] {
    if (!showSiteInspections) return [];
    return installations.filter((i) => {
      if (!i.site_inspection_required || !i.site_inspection_date) return false;
      return isSameDay(parseDate(i.site_inspection_date), d);
    });
  }

  // ── Month view ──────────────────────────────────────────────
  function MonthView() {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    // Monday-start grid
    const startPad = ((firstDay.getDay() + 6) % 7);
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = i - startPad;
      cells.push(d >= 0 && d < lastDay.getDate() ? new Date(year, month, d + 1) : null);
    }

    return (
      <div>
        <div className="grid grid-cols-7 border-l border-t border-gray-100">
          {DAY_HEADERS.map((h, i) => (
            <div key={h} className="border-r border-b border-gray-100 py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
              <span className="hidden sm:inline">{h}</span>
              <span className="sm:hidden">{DAY_HEADERS_MOB[i]}</span>
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={`empty-${i}`} className="border-r border-b border-gray-100 min-h-[80px] bg-gray-50/40" />;
            const isToday = isSameDay(d, today);
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const dayInsts = instForDay(d);
            const siInsts = siteInspForDay(d);
            const totalItems = dayInsts.length + siInsts.length;
            return (
              <div key={d.toISOString()} className={`border-r border-b border-gray-100 min-h-[80px] p-1.5 ${isWeekend ? "bg-gray-50/60" : ""}`}>
                <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${
                  isToday ? "bg-gray-900 text-white" : "text-gray-400"
                }`}>{d.getDate()}</span>
                <div className="space-y-0.5">
                  {siInsts.slice(0, 2).map((inst) => (
                    <button key={`si-${inst.id}`} onClick={(e) => { e.stopPropagation(); onChipClick(inst); }}
                      title={`Site Inspection: ${inst.title}`}
                      className="w-full text-left text-[10px] font-medium px-1.5 py-0.5 rounded truncate flex items-center gap-1 bg-violet-100 text-violet-800 hover:opacity-80 transition-opacity">
                      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-bold shrink-0 bg-violet-600 text-white">SI</span>
                      <span className="truncate">{inst.title}</span>
                    </button>
                  ))}
                  {dayInsts.slice(0, Math.max(0, 3 - siInsts.slice(0, 2).length)).map((inst) => {
                    const start = installationDate(inst)!;
                    const end = installationEndDate(inst) ?? start;
                    const isStart = isSameDay(d, start);
                    const isEnd = isSameDay(d, end);
                    const isMultiDay = !isSameDay(start, end);
                    const chipBg = inst.installers?.[0]
                      ? installerColor(inst.installers[0]).chip
                      : getInstallationStage(inst.status).chipColor;
                    return (
                      <button key={inst.id} onClick={(e) => { e.stopPropagation(); onChipClick(inst); }}
                        title={inst.title}
                        className={`w-full text-left text-[10px] font-medium px-1.5 py-0.5 min-h-[18px] flex items-center gap-1 ${chipBg} text-gray-800 hover:opacity-80 transition-opacity
                          ${isMultiDay ? (isStart ? "rounded-l-full rounded-r-none" : isEnd ? "rounded-r-full rounded-l-none" : "rounded-none") : "rounded"}`}>
                        {inst.installers?.[0] && (
                          <span className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[8px] font-bold shrink-0 ${installerColor(inst.installers[0]).bg} ${installerColor(inst.installers[0]).text}`}>
                            {installerInitials(inst.installers[0])}
                          </span>
                        )}
                        <span className="truncate">{inst.title}</span>
                      </button>
                    );
                  })}
                  {totalItems > 3 && (
                    <p className="text-[10px] text-gray-400 pl-1">+{totalItems - 3} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Week view ───────────────────────────────────────────────
  function WeekView() {
    const weekStart = startOfWeek(cursor);
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    return (
      <div className="grid grid-cols-7 border-l border-t border-gray-100">
        {days.map((d) => {
          const isToday = isSameDay(d, today);
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const dayInsts = instForDay(d);
          const siInsts = siteInspForDay(d);
          return (
            <div key={d.toISOString()} className={`border-r border-b border-gray-100 min-h-[200px] ${isWeekend ? "bg-gray-50/60" : ""}`}>
              <div className={`py-2 text-center border-b border-gray-100 ${isToday ? "bg-gray-900" : "bg-gray-50"}`}>
                <p className={`text-[10px] font-medium uppercase ${isToday ? "text-white" : "text-gray-400"}`}>
                  {DAY_HEADERS[(d.getDay() + 6) % 7]}
                </p>
                <p className={`text-lg font-semibold ${isToday ? "text-white" : "text-gray-700"}`}>{d.getDate()}</p>
              </div>
              <div className="p-1.5 space-y-1">
                {siInsts.map((inst) => (
                  <SiteInspectionChip key={`si-${inst.id}`} inst={inst} onClick={() => onChipClick(inst)} />
                ))}
                {dayInsts.map((inst) => (
                  <InstallationChip key={inst.id} inst={inst} onClick={() => onChipClick(inst)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Day view ────────────────────────────────────────────────
  function DayView() {
    const dayInsts = instForDay(cursor);
    const isToday = isSameDay(cursor, today);
    return (
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className={`py-4 px-5 border-b border-gray-100 ${isToday ? "bg-gray-900 text-white" : "bg-gray-50"}`}>
          <p className={`text-xs uppercase font-medium tracking-wide ${isToday ? "text-gray-300" : "text-gray-400"}`}>
            {cursor.toLocaleDateString("en-ZA", { weekday: "long" })}
          </p>
          <p className={`text-2xl font-semibold ${isToday ? "text-white" : "text-gray-800"}`}>
            {cursor.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="p-4">
          {dayInsts.length === 0 && siteInspForDay(cursor).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No installations scheduled</p>
          ) : (
            <div className="space-y-2">
              {siteInspForDay(cursor).map((inst) => {
                return (
                  <button key={`si-${inst.id}`} onClick={() => onChipClick(inst)}
                    className="w-full text-left p-3.5 rounded-xl border border-violet-200 bg-violet-50 hover:shadow-sm transition-shadow flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[9px] font-bold shrink-0 bg-violet-600 text-white">SI</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-violet-900 truncate">{inst.title}</p>
                      {inst.site_inspection_owner && <p className="text-xs text-violet-400">{inst.site_inspection_owner}</p>}
                    </div>
                  </button>
                );
              })}
              {dayInsts.map((inst) => {
                const stage = getInstallationStage(inst.status);
                return (
                  <button key={inst.id} onClick={() => onChipClick(inst)}
                    className={`w-full text-left p-3.5 rounded-xl border border-gray-100 hover:shadow-sm transition-shadow flex items-center gap-3`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${stage.dotColor} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{inst.title}</p>
                      {inst.client_name && <p className="text-xs text-gray-400">{inst.client_name}</p>}
                    </div>
                    {inst.scheduled_time_start && (
                      <p className="text-xs text-gray-400 shrink-0">{inst.scheduled_time_start.slice(0, 5)}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Navigation labels
  const navLabel = mode === "month"
    ? `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`
    : mode === "week"
    ? (() => { const ws = startOfWeek(cursor); const we = addDays(ws, 6); return `${ws.toLocaleDateString("en-ZA",{day:"numeric",month:"short"})} – ${we.toLocaleDateString("en-ZA",{day:"numeric",month:"short",year:"numeric"})}`; })()
    : cursor.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function navigate(dir: 1 | -1) {
    if (mode === "month") setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
    else if (mode === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => addDays(c, dir));
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Main calendar */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => navigate(1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-gray-900">{navLabel}</span>
            <button onClick={() => setCursor(new Date())} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              Today
            </button>
          </div>
          <div className="flex items-center gap-1">
            {(["month", "week", "day"] as CalendarMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors capitalize ${mode === m ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
                {m}
              </button>
            ))}
          </div>
        </div>

        {mode === "month" && <MonthView />}
        {mode === "week" && <WeekView />}
        {mode === "day" && <DayView />}
      </div>

      {/* Unscheduled — sidebar on desktop, section below on mobile */}
      <div className="lg:w-[220px] lg:shrink-0">
        <div className="sticky top-0">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-3">Unscheduled ({unscheduled.length})</p>
          {unscheduled.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-6 border border-dashed border-gray-200 rounded-xl">None</p>
          ) : (
            <div className="space-y-2">
              {unscheduled.map((inst) => {
                const stage = getInstallationStage(inst.status);
                return (
                  <button key={inst.id} onClick={() => onChipClick(inst)}
                    className="w-full text-left p-3 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${stage.dotColor}`} />
                      <span className={`text-[10px] uppercase tracking-wider font-medium ${stage.textColor}`}>{stage.label}</span>
                    </div>
                    <p className="text-xs font-medium text-gray-700 truncate">{inst.title}</p>
                    {inst.client_name && <p className="text-[11px] text-gray-400 truncate">{inst.client_name}</p>}
                    <p className="text-[10px] text-amber-500 mt-1">{inst.date_tbc ? "Date TBC" : "No date set"}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
