import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { InstallationStatus, InstallationPriority } from "@/features/installations/lib/stages";

// ── Types ────────────────────────────────────────────────────

export interface Installation {
  id: string;
  title: string;
  project_id: string | null;
  client_name: string | null;
  site_address: string | null;
  suburb: string | null;
  scheduled_date: string | null;
  scheduled_end_date: string | null;
  scheduled_time_start: string | null;
  scheduled_time_end: string | null;
  date_tbc: boolean;
  status: InstallationStatus;
  priority: InstallationPriority;
  site_inspection_required: boolean;
  site_inspection_date: string | null;
  site_inspection_owner: string | null;
  site_inspection_done: boolean;
  site_inspection_notes: string | null;
  owner: string | null;
  checklist_walls_prepared: boolean;
  checklist_access_confirmed: boolean;
  checklist_delivery_on_site: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joined
  installers?: string[];
  products?: InstallationProduct[];
  snags?: InstallationSnag[];
  completion?: InstallationCompletion | null;
  signoff?: InstallationSignoff | null;
}

export interface InstallationProduct {
  id: string;
  installation_id: string;
  name: string;
  sku: string | null;
  quantity: number | null;
  unit: string | null;
  sort_order: number;
}

export interface InstallationSnag {
  id: string;
  installation_id: string;
  description: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface InstallationCompletion {
  id: string;
  installation_id: string;
  installer_notes: string | null;
  actual_duration_mins: number | null;
  client_signoff_name: string | null;
  client_signoff_date: string | null;
  completed_at: string;
}

export interface InstallationSignoff {
  id: string;
  installation_id: string;
  signed_by: string;
  signed_at: string;
  notes: string | null;
  created_at: string;
}

export interface NewInstallationInput {
  title: string;
  project_id?: string;
  client_name?: string;
  site_address?: string;
  suburb?: string;
  scheduled_date?: string;
  scheduled_end_date?: string;
  scheduled_time_start?: string;
  scheduled_time_end?: string;
  date_tbc?: boolean;
  priority?: InstallationPriority;
  site_inspection_required?: boolean;
  site_inspection_date?: string;
  site_inspection_owner?: string;
  notes?: string;
  owner?: string;
  installers?: string[];
  products?: Omit<InstallationProduct, "id" | "installation_id">[];
}

export type UpdateInstallationInput = Partial<Omit<NewInstallationInput, "installers" | "products">> & {
  status?: InstallationStatus;
  site_inspection_done?: boolean;
  site_inspection_notes?: string;
  checklist_walls_prepared?: boolean;
  checklist_access_confirmed?: boolean;
  checklist_delivery_on_site?: boolean;
};

// ── Helpers ──────────────────────────────────────────────────

async function fetchInstallations(): Promise<Installation[]> {
  const { data: rows, error } = await supabase
    .from("installations")
    .select("*")
    .order("scheduled_date", { ascending: true, nullsFirst: false });
  if (error) throw error;

  // Fetch related data in parallel
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) return [];

  const [installersRes, snagsRes, completionRes, signoffRes] = await Promise.all([
    supabase.from("installation_installers").select("*").in("installation_id", ids),
    supabase.from("installation_snags").select("*").in("installation_id", ids).order("created_at"),
    supabase.from("installation_completion").select("*").in("installation_id", ids),
    supabase.from("installation_signoff").select("*").in("installation_id", ids),
  ]);

  const installerMap: Record<string, string[]> = {};
  (installersRes.data ?? []).forEach((r) => {
    installerMap[r.installation_id] = [...(installerMap[r.installation_id] ?? []), r.team_member];
  });
  const snagMap: Record<string, InstallationSnag[]> = {};
  (snagsRes.data ?? []).forEach((r) => {
    snagMap[r.installation_id] = [...(snagMap[r.installation_id] ?? []), r];
  });
  const completionMap: Record<string, InstallationCompletion> = {};
  (completionRes.data ?? []).forEach((r) => { completionMap[r.installation_id] = r; });
  const signoffMap: Record<string, InstallationSignoff> = {};
  (signoffRes.data ?? []).forEach((r) => { signoffMap[r.installation_id] = r; });

  return rows.map((r) => ({
    ...r,
    installers: installerMap[r.id] ?? [],
    snags: snagMap[r.id] ?? [],
    completion: completionMap[r.id] ?? null,
    signoff: signoffMap[r.id] ?? null,
  }));
}

// ── Hooks ────────────────────────────────────────────────────

export function useInstallations() {
  return useQuery({ queryKey: ["installations"], queryFn: fetchInstallations, staleTime: 30_000 });
}

export function useCreateInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewInstallationInput) => {
      const { installers, products, ...fields } = input;
      const { data, error } = await supabase
        .from("installations")
        .insert(fields)
        .select()
        .single();
      if (error) throw error;
      const id = data.id;

      if (installers?.length) {
        await supabase.from("installation_installers").insert(
          installers.map((m) => ({ installation_id: id, team_member: m }))
        );
      }
      if (products?.length) {
        await supabase.from("installation_products").insert(
          products.map((p, i) => ({ ...p, installation_id: id, sort_order: i }))
        );
      }
      return data as Installation;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}

export function useUpdateInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateInstallationInput }) => {
      const { error } = await supabase.from("installations").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}

export function useUpdateInstallers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ installationId, installers }: { installationId: string; installers: string[] }) => {
      await supabase.from("installation_installers").delete().eq("installation_id", installationId);
      if (installers.length) {
        await supabase.from("installation_installers").insert(
          installers.map((m) => ({ installation_id: installationId, team_member: m }))
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}

export function useDeleteInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("installations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}

// Snags
export function useAddSnag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ installationId, description }: { installationId: string; description: string }) => {
      const { error } = await supabase.from("installation_snags").insert({ installation_id: installationId, description });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}

export function useResolveSnag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (snagId: string) => {
      const { error } = await supabase.from("installation_snags")
        .update({ resolved: true, resolved_at: new Date().toISOString() })
        .eq("id", snagId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}

// Completion
export function useCompleteInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      installationId, installer_notes, actual_duration_mins,
      client_signoff_name, client_signoff_date,
    }: {
      installationId: string;
      installer_notes?: string;
      actual_duration_mins?: number;
      client_signoff_name?: string;
      client_signoff_date?: string;
    }) => {
      // Upsert completion record
      const { error: cErr } = await supabase.from("installation_completion").upsert({
        installation_id: installationId,
        installer_notes,
        actual_duration_mins,
        client_signoff_name,
        client_signoff_date,
      }, { onConflict: "installation_id" });
      if (cErr) throw cErr;
      // Update status
      const { error: uErr } = await supabase.from("installations")
        .update({ status: "completed" }).eq("id", installationId);
      if (uErr) throw uErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}

// Sign-off
export function useSignOffInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      installationId, signed_by, signed_at, notes,
    }: {
      installationId: string;
      signed_by: string;
      signed_at: string;
      notes?: string;
    }) => {
      const { error: sErr } = await supabase.from("installation_signoff").upsert({
        installation_id: installationId,
        signed_by,
        signed_at,
        notes,
      }, { onConflict: "installation_id" });
      if (sErr) throw sErr;
      const { error: uErr } = await supabase.from("installations")
        .update({ status: "signed_off" }).eq("id", installationId);
      if (uErr) throw uErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["installations"] }),
  });
}
