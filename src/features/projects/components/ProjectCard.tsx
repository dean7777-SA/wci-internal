import { motion } from "framer-motion";
import type { Project } from "@/hooks/useProjects";
import { getStage, daysInStage } from "../lib/stages";

interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  hospitality: "Hospitality",
  commercial: "Commercial",
  retail: "Retail",
};

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const days = daysInStage(project.stage_entered_at);
  const stage = getStage(project.current_stage);
  const isStuck = days > 14 && project.current_stage !== "completed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2 }}
      onClick={() => onClick(project)}
      className="bg-white border border-gray-200 rounded-xl px-4 py-3.5 cursor-pointer hover:shadow-md hover:border-gray-300 transition-all duration-200 group"
    >
      <p className="font-mono text-[10px] text-gray-400 tracking-wider mb-1.5">
        {project.project_code}
      </p>
      <p className="text-[15px] font-medium text-gray-900 leading-tight mb-0.5 group-hover:text-gray-700 transition-colors">
        {project.name}
      </p>
      <p className="text-sm text-gray-500 mb-1">{project.client_name}</p>

      {project.estimated_value != null && project.estimated_value > 0 && (
        <p className="font-mono text-[11px] text-gray-400 mb-3">
          R {project.estimated_value.toLocaleString("en-ZA", { maximumFractionDigits: 0 })}
        </p>
      )}
      {(!project.estimated_value || project.estimated_value === 0) && <div className="mb-3" />}

      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-full font-medium ${stage.color} ${stage.textColor}`}>
          {TYPE_LABELS[project.project_type] ?? project.project_type}
        </span>
        <div className="flex items-center gap-1.5">
          {isStuck && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" title={`${days} days in this stage`} />}
          <span className={`text-xs ${isStuck ? "text-orange-500" : "text-gray-400"}`}>{days}d</span>
          {project.assigned_to && (
            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[9px] font-medium text-gray-600 shrink-0">
              {project.assigned_to.charAt(0)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
