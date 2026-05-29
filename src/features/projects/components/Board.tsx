import type { Project } from "@/hooks/useProjects";
import { STAGES } from "../lib/stages";
import { BoardColumn } from "./BoardColumn";

interface BoardProps {
  projects: Project[];
  onCardClick: (project: Project) => void;
}

export function Board({ projects, onCardClick }: BoardProps) {
  return (
    <div className="overflow-x-auto pb-8">
      <div className="flex gap-4 min-w-max">
        {STAGES.map((stage) => (
          <BoardColumn
            key={stage.id}
            stage={stage}
            projects={projects.filter((p) => p.current_stage === stage.id)}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}
