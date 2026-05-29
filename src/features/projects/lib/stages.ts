import type { ProjectStage, ProjectType } from "@/hooks/useProjects";

export interface StageConfig {
  id: ProjectStage;
  label: string;
  color: string;
  textColor: string;
  dotColor: string;
}

export const STAGES: StageConfig[] = [
  { id: "conceptual", label: "Conceptual", color: "bg-slate-100", textColor: "text-slate-600", dotColor: "bg-slate-400" },
  { id: "design",     label: "Design",     color: "bg-violet-100", textColor: "text-violet-700", dotColor: "bg-violet-400" },
  { id: "quote",      label: "Quote",      color: "bg-amber-100",  textColor: "text-amber-700",  dotColor: "bg-amber-400" },
  { id: "invoiced",   label: "Invoiced",   color: "bg-sky-100",    textColor: "text-sky-700",    dotColor: "bg-sky-400" },
  { id: "completed",  label: "Completed",  color: "bg-emerald-100", textColor: "text-emerald-700", dotColor: "bg-emerald-400" },
];

export const STAGE_ORDER: ProjectStage[] = ["conceptual", "design", "quote", "invoiced", "completed"];

export function getStage(id: ProjectStage): StageConfig {
  return STAGES.find((s) => s.id === id) ?? STAGES[0];
}

export function getNextStage(current: ProjectStage): ProjectStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function getPrevStage(current: ProjectStage): ProjectStage | null {
  const idx = STAGE_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return STAGE_ORDER[idx - 1];
}

export const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: "residential",  label: "Residential" },
  { value: "hospitality",  label: "Hospitality" },
  { value: "commercial",   label: "Commercial" },
  { value: "retail",       label: "Retail" },
];

export const TEAM_MEMBERS = ["Felicity", "Amelia", "Alana", "Michael", "Lorraine", "Dean"] as const;

export function daysInStage(stageEnteredAt: string): number {
  const entered = new Date(stageEnteredAt).getTime();
  const now = Date.now();
  return Math.floor((now - entered) / (1000 * 60 * 60 * 24));
}
