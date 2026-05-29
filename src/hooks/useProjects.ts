import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type ProjectType = "residential" | "hospitality" | "commercial" | "retail";
export type ProjectStage = "conceptual" | "design" | "quote" | "invoiced" | "completed";
export type ProjectStatus = "active" | "on_hold" | "cancelled" | "completed";

export interface Project {
  id: string;
  project_code: string;
  name: string;
  client_name: string;
  contact_person: string | null;
  contact_role: string | null;
  contact_email: string | null;
  location: string | null;
  site_address: string | null;
  project_type: ProjectType;
  current_stage: ProjectStage;
  status: ProjectStatus;
  assigned_to: string | null;
  estimated_value: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stage_entered_at: string;
}

export interface StageHistoryEntry {
  id: string;
  project_id: string;
  from_stage: string;
  to_stage: string;
  changed_by: string | null;
  changed_at: string;
  note: string | null;
}

export interface NewProjectInput {
  name: string;
  client_name: string;
  contact_person?: string;
  contact_role?: string;
  contact_email?: string;
  location?: string;
  site_address?: string;
  project_type: ProjectType;
  assigned_to?: string;
  estimated_value?: number;
  notes?: string;
}

export interface UpdateProjectInput extends Partial<NewProjectInput> {
  id: string;
  current_stage?: ProjectStage;
  status?: ProjectStatus;
}

export const projectKeys = {
  all: ["projects"] as const,
  list: () => [...projectKeys.all, "list"] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
  history: (id: string) => [...projectKeys.all, "history", id] as const,
};

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: projectKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}

export function useProjectHistory(projectId: string) {
  return useQuery<StageHistoryEntry[]>({
    queryKey: projectKeys.history(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_stage_history")
        .select("*")
        .eq("project_id", projectId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as StageHistoryEntry[];
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewProjectInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      const ts = Date.now().toString().slice(-5);
      const project_code = `P-${new Date().getFullYear()}-${ts}`;
      const { data, error } = await supabase
        .from("projects")
        .insert({
          ...input,
          project_code,
          created_by: user?.id ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.list() }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .update(input as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: projectKeys.list() });
      qc.invalidateQueries({ queryKey: projectKeys.detail(data.id) });
      qc.invalidateQueries({ queryKey: projectKeys.history(data.id) });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.list() }),
  });
}
