import { AnimatePresence } from "framer-motion";
import type { Project } from "@/hooks/useProjects";
import type { StageConfig } from "../lib/stages";
import { ProjectCard } from "./ProjectCard";

interface BoardColumnProps {
  stage: StageConfig;
  projects: Project[];
  onCardClick: (project: Project) => void;
}

export function BoardColumn({ stage, projects, onCardClick }: BoardColumnProps) {
  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${stage.dotColor}`} />
        <span className="text-xs tracking-[0.15em] uppercase text-gray-500 font-medium">
          {stage.label}
        </span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {projects.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 min-h-[120px]">
        <AnimatePresence>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={onCardClick} />
          ))}
        </AnimatePresence>
        {projects.length === 0 && (
          <div className="border border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
            <span className="text-xs text-gray-300">No projects</span>
          </div>
        )}
      </div>
    </div>
  );
}
