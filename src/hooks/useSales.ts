import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/* ─── Assignment notification helper ─── */
async function sendAssignmentNotification({
  assigneeName,
  enquiryType,
  clientName,
  clientEmail,
  clientPhone,
  clientCompany,
  clientRole,
  clientLocation,
  projectName,
  projectLocation,
  projectStage,
  projectNotes,
  requestType,
  message,
  designCount,
  wallCount,
  designs,
  wallDimensions,
  attachmentUrl,
}: {
  assigneeName: string;
  enquiryType: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCompany?: string | null;
  clientRole?: string | null;
  clientLocation?: string | null;
  projectName?: string | null;
  projectLocation?: string | null;
  projectStage?: string | null;
  projectNotes?: string | null;
  requestType?: string | null;
  message?: string | null;
  designCount?: number;
  wallCount?: number;
  designs?: any[];
  wallDimensions?: any[];
  attachmentUrl?: string | null;
}) {
  // Look up assignee email from profiles table by display_name
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .ilike("display_name", assigneeName)
    .maybeSingle();

  const recipientEmail = (profile as any)?.email;
  if (!recipientEmail) {
    console.warn(`No email found for team member "${assigneeName}" — skipping notification`);
    return;
  }

  try {
    await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "assignment-notification",
        recipientEmail,
        templateData: {
          assigneeName,
          enquiryType,
          clientName,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          clientCompany: clientCompany || undefined,
          clientRole: clientRole || undefined,
          clientLocation: clientLocation || undefined,
          projectName: projectName || undefined,
          projectLocation: projectLocation || undefined,
          projectStage: projectStage || undefined,
          projectNotes: projectNotes || undefined,
          requestType: requestType || undefined,
          message: message || undefined,
          designCount: designCount ? String(designCount) : undefined,
          wallCount: wallCount ? String(wallCount) : undefined,
          designs: designs || undefined,
          wallDimensions: wallDimensions || undefined,
          attachmentUrl: attachmentUrl || undefined,
        },
      },
    });
  } catch (err) {
    console.error("Failed to send assignment notification:", err);
  }
}

/* ─── Types ─── */

export interface ContactSubmission {
  id: string;
  form_type: string;
  name: string;
  surname: string;
  email: string;
  dialing_code: string | null;
  phone: string | null;
  location: string | null;
  country: string | null;
  company: string | null;
  project_name: string | null;
  role: string | null;
  message: string | null;
  attachment_url: string | null;
  project_stage: string | null;
  quantity_estimate: string | null;
  trade_assist: string | null;
  project_type: string | null;
  bespoke_type: string | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

export interface DesignItem {
  product_id: number;
  variation_id: number | null;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  product_colour: string | null;
  product_sku: string | null;
  product_category: string | null;
  product_price: string | null;
  sample_requested?: boolean;
}

export interface WallDimension {
  name: string;
  width: string;
  height: string;
  notes: string;
}

export interface EstimateRequest {
  id: string;
  user_id: string;
  project_id: string;
  selected_designs: DesignItem[];
  full_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  project_name: string | null;
  project_location: string | null;
  project_notes: string | null;
  professional_role: string | null;
  project_stage: string | null;
  request_type: string | null;
  wall_dimensions: WallDimension[] | null;
  status: string;
  assigned_to: string | null;
  created_at: string;
}

/* ─── Queries ─── */

export function useContactSubmissions() {
  return useQuery<ContactSubmission[]>({
    queryKey: ["sales", "contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContactSubmission[];
    },
  });
}

export function useEstimateRequests() {
  return useQuery<EstimateRequest[]>({
    queryKey: ["sales", "estimates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estimate_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        selected_designs: (r.selected_designs ?? []) as unknown as DesignItem[],
        wall_dimensions: (r.wall_dimensions ?? null) as unknown as WallDimension[] | null,
      })) as unknown as EstimateRequest[];
    },
  });
}

/* ─── Mutations ─── */

export function useUpdateContactStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales", "contacts"] }),
  });
}

export function useUpdateEstimateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("estimate_requests")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales", "estimates"] }),
  });
}

export function useAssignContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigned_to, contact }: { id: string; assigned_to: string | null; contact?: ContactSubmission }) => {
      const { error } = await supabase
        .from("contact_submissions")
        .update({ assigned_to } as any)
        .eq("id", id);
      if (error) throw error;

      // Send notification email when assigning (not un-assigning)
      if (assigned_to && contact) {
        sendAssignmentNotification({
          assigneeName: assigned_to,
          enquiryType: contact.form_type || "contact",
          clientName: `${contact.name} ${contact.surname}`,
          clientEmail: contact.email,
          clientPhone: contact.phone ? `${contact.dialing_code || ""} ${contact.phone}`.trim() : null,
          clientCompany: contact.company,
          clientRole: contact.role,
          clientLocation: [contact.location, contact.country].filter(Boolean).join(", ") || null,
          projectName: contact.project_name,
          projectStage: contact.project_stage,
          message: contact.message,
          attachmentUrl: contact.attachment_url,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales", "contacts"] }),
  });
}

export function useAssignEstimate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigned_to, estimate }: { id: string; assigned_to: string | null; estimate?: EstimateRequest }) => {
      const { error } = await supabase
        .from("estimate_requests")
        .update({ assigned_to } as any)
        .eq("id", id);
      if (error) throw error;

      // Send notification email when assigning (not un-assigning)
      if (assigned_to && estimate) {
        sendAssignmentNotification({
          assigneeName: assigned_to,
          enquiryType: estimate.request_type || "estimate",
          clientName: estimate.full_name,
          clientEmail: estimate.email,
          clientPhone: estimate.phone,
          clientCompany: estimate.company_name,
          clientRole: estimate.professional_role,
          projectName: estimate.project_name,
          projectLocation: estimate.project_location,
          projectStage: estimate.project_stage,
          projectNotes: estimate.project_notes,
          requestType: estimate.request_type,
          designCount: estimate.selected_designs?.length,
          wallCount: estimate.wall_dimensions?.length,
          designs: estimate.selected_designs?.map((d) => ({
            name: d.product_name,
            colour: d.product_colour,
            sku: d.product_sku,
            image: d.product_image,
            category: d.product_category,
            sampleRequested: d.sample_requested,
          })),
          wallDimensions: estimate.wall_dimensions ?? undefined,
        });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales", "estimates"] }),
  });
}
