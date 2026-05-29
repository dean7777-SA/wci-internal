export type InstallationStatus = "scheduled" | "in_progress" | "completed" | "signed_off";
export type InstallationPriority = "high" | "medium" | "low";

export interface InstallationStage {
  id: InstallationStatus;
  label: string;
  color: string;       // bg class
  textColor: string;   // text class
  dotColor: string;    // dot bg class
  chipColor: string;   // calendar chip bg
}

export const INSTALLATION_STAGES: InstallationStage[] = [
  { id: "scheduled",   label: "Scheduled",   color: "bg-slate-100",   textColor: "text-slate-700",  dotColor: "bg-slate-400",   chipColor: "bg-slate-300" },
  { id: "in_progress", label: "In Progress", color: "bg-amber-50",    textColor: "text-amber-700",  dotColor: "bg-amber-400",   chipColor: "bg-amber-300" },
  { id: "completed",   label: "Completed",   color: "bg-emerald-50",  textColor: "text-emerald-700",dotColor: "bg-emerald-400", chipColor: "bg-emerald-300" },
  { id: "signed_off",  label: "Signed Off",  color: "bg-violet-50",   textColor: "text-violet-700", dotColor: "bg-violet-400",  chipColor: "bg-violet-300" },
];

export const INSTALLATION_STAGE_ORDER: InstallationStatus[] = ["scheduled", "in_progress", "completed", "signed_off"];

export function getInstallationStage(id: InstallationStatus): InstallationStage {
  return INSTALLATION_STAGES.find((s) => s.id === id) ?? INSTALLATION_STAGES[0];
}

export const PRIORITY_CONFIG: Record<InstallationPriority, { label: string; color: string; textColor: string }> = {
  high:   { label: "High",   color: "bg-red-100",    textColor: "text-red-700" },
  medium: { label: "Medium", color: "bg-amber-100",  textColor: "text-amber-700" },
  low:    { label: "Low",    color: "bg-green-100",  textColor: "text-green-700" },
};

export const OWNERS = ["Felicity", "Amelia", "Alana", "Michael", "Lorraine"] as const;
export type Owner = typeof OWNERS[number];

export const INSTALLERS = ["Simon", "Zizzi", "JHB Team"] as const;
export type Installer = typeof INSTALLERS[number];

export const INSTALLER_COLORS: Record<string, { bg: string; text: string; dot: string; chip: string }> = {
  "Simon":    { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-400",   chip: "bg-blue-200"   },
  "Zizzi":    { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-400", chip: "bg-violet-200" },
  "JHB Team": { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400", chip: "bg-orange-200" },
};

export function installerColor(name: string) {
  return INSTALLER_COLORS[name] ?? { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400", chip: "bg-gray-200" };
}

export function installerInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export const SITE_INSPECTORS = ["Amelia", "Felicity", "Omar", "Simon", "Lorraine", "Michael"] as const;
export type SiteInspector = typeof SITE_INSPECTORS[number];

export const PRE_INSTALL_CHECKLIST = [
  { key: "checklist_walls_prepared",    label: "Walls prepared" },
  { key: "checklist_access_confirmed",  label: "Access confirmed" },
  { key: "checklist_delivery_on_site",  label: "Delivery on site" },
] as const;

export type ChecklistKey = typeof PRE_INSTALL_CHECKLIST[number]["key"];

export const NOTIFICATION_TRIGGERS = [
  { value: "t_minus_7",     label: "7 days before" },
  { value: "t_minus_1",     label: "1 day before" },
  { value: "day_of",        label: "Day of installation" },
  { value: "status_change", label: "On status change" },
  { value: "overdue",       label: "When overdue" },
] as const;
