import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  company: string | null;
  location: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
}

const VALID_ROLES = ["user", "sales", "admin", "installer"] as const;
export type UserRole = (typeof VALID_ROLES)[number];

export function useAllProfiles() {
  return useQuery<UserProfile[]>({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as UserProfile[];
    },
  });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      if (!VALID_ROLES.includes(role)) throw new Error("Invalid role");
      const { error } = await supabase
        .from("profiles")
        .update({ role } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "profiles"] }),
  });
}

export function useUpdateWhatsApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, whatsapp_phone }: { id: string; whatsapp_phone: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ whatsapp_phone } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "profiles"] }),
  });
}

export function useContactSubmissions() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useEstimateRequests() {
  return useQuery({
    queryKey: ["estimates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimate_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
