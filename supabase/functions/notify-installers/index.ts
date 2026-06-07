import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL      = () => Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY  = () => Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function buildWaMe(phone: string, message: string): string {
  const cleaned = phone.replace(/\s+/g, "").replace(/^\+/, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

function waMessage(
  name: string,
  title: string,
  client: string | null,
  location: string,
  dateRange: string,
  timeStr: string,
): string {
  const lines = [
    `Hi ${name} 👋`,
    ``,
    `You've been scheduled for an installation:`,
    ``,
    `📋 *${title}*`,
    `👤 Client: ${client ?? "—"}`,
    `📍 ${location}`,
    `📅 ${dateRange}`,
  ];
  if (timeStr) lines.push(`⏰ ${timeStr}`);
  lines.push(``, `Please confirm receipt. — Wonderland Collective`);
  return lines.join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { installation_id } = await req.json();
    if (!installation_id) {
      return new Response(JSON.stringify({ error: "installation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL(), SERVICE_ROLE_KEY());

    // ── Fetch installation ─────────────────────────────────────
    const { data: inst, error: instError } = await supabase
      .from("installations")
      .select("id, title, client_name, site_address, suburb, scheduled_date, scheduled_end_date, scheduled_time_start, scheduled_time_end, priority, notes")
      .eq("id", installation_id)
      .single();

    if (instError || !inst) {
      return new Response(JSON.stringify({ error: "Installation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch assigned installers ──────────────────────────────
    const { data: assigned } = await supabase
      .from("installation_installers")
      .select("team_member")
      .eq("installation_id", installation_id);

    const installerNames: string[] = (assigned ?? []).map((r: any) => r.team_member);
    if (installerNames.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No installers assigned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch products ─────────────────────────────────────────
    const { data: productRows } = await supabase
      .from("installation_products")
      .select("name, sku, quantity, unit")
      .eq("installation_id", installation_id)
      .order("sort_order", { ascending: true });

    // ── Fetch installer profiles ───────────────────────────────
    const { data: profiles } = await supabase
      .from("profiles")
      .select("display_name, email, whatsapp_phone")
      .in("display_name", installerNames);

    // ── Build date strings ─────────────────────────────────────
    const fmtD = (iso: string) =>
      new Date(iso).toLocaleDateString("en-ZA", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });

    const startStr   = inst.scheduled_date ? fmtD(inst.scheduled_date) : "TBC";
    const endStr     = inst.scheduled_end_date ? fmtD(inst.scheduled_end_date) : null;
    const dateRange  = endStr && endStr !== startStr ? `${startStr} → ${endStr}` : startStr;
    const timeStr    = [inst.scheduled_time_start, inst.scheduled_time_end].filter(Boolean).join(" – ");
    const location   = [inst.suburb, inst.site_address].filter(Boolean).join(", ") || "—";

    // ── Twilio config (optional — omit if not set) ─────────────
    const twilioSid   = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom  = Deno.env.get("TWILIO_WHATSAPP_FROM");
    const twilioReady = !!(twilioSid && twilioToken && twilioFrom);

    const results: { name: string; email?: string; whatsapp?: string; waLink?: string; errors: string[] }[] = [];

    for (const profile of (profiles ?? [])) {
      const name   = profile.display_name ?? "Team member";
      const result: typeof results[0] = { name, errors: [] };

      // ── Send email ───────────────────────────────────────────
      if (profile.email) {
        try {
          const emailRes = await fetch(`${SUPABASE_URL()}/functions/v1/send-transactional-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SERVICE_ROLE_KEY()}`,
            },
            body: JSON.stringify({
              template: "installer-notification",
              to: profile.email,
              idempotencyKey: `installer-notif-${installation_id}-${profile.email}`,
              data: {
                installerName:        name,
                installationTitle:    inst.title,
                clientName:           inst.client_name,
                siteAddress:          inst.site_address,
                suburb:               inst.suburb,
                scheduledDate:        inst.scheduled_date,
                scheduledEndDate:     inst.scheduled_end_date,
                scheduledTimeStart:   inst.scheduled_time_start,
                scheduledTimeEnd:     inst.scheduled_time_end,
                priority:             inst.priority,
                notes:                inst.notes,
                products:             productRows ?? [],
                installationId:       inst.id,
              },
            }),
          });
          result.email = emailRes.ok ? "sent" : `failed (${emailRes.status})`;
          if (!emailRes.ok) result.errors.push(`Email: ${await emailRes.text()}`);
        } catch (e: any) {
          result.email = "error";
          result.errors.push(`Email: ${e.message}`);
        }
      }

      // ── WhatsApp via Twilio (when configured) ────────────────
      const phone = profile.whatsapp_phone?.replace(/\s+/g, "");
      if (phone) {
        const msgBody = waMessage(name, inst.title, inst.client_name, location, dateRange, timeStr);

        if (twilioReady) {
          const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
          const params = new URLSearchParams({ From: twilioFrom!, To: to, Body: msgBody });
          try {
            const twRes = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                },
                body: params.toString(),
              }
            );
            result.whatsapp = twRes.ok ? "sent" : `failed (${twRes.status})`;
            if (!twRes.ok) result.errors.push(`WhatsApp: ${await twRes.text()}`);
          } catch (e: any) {
            result.whatsapp = "error";
            result.errors.push(`WhatsApp: ${e.message}`);
          }
        }

        // Always return a wa.me link as manual fallback
        result.waLink = buildWaMe(phone, msgBody);
      }

      results.push(result);
    }

    // For any installer name not matched to a profile, still return a basic entry
    for (const name of installerNames) {
      if (!results.find((r) => r.name === name)) {
        results.push({ name, errors: ["No profile found — no email or phone on file"] });
      }
    }

    const emailsSent    = results.filter((r) => r.email === "sent").length;
    const whatsappSent  = results.filter((r) => r.whatsapp === "sent").length;
    const waLinks       = results.filter((r) => r.waLink).map((r) => ({ name: r.name, url: r.waLink! }));

    return new Response(JSON.stringify({ emailsSent, whatsappSent, waLinks, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { installation_id } = await req.json();
    if (!installation_id) {
      return new Response(JSON.stringify({ error: "installation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the installation
    const { data: installation, error: instError } = await supabase
      .from("installations")
      .select("title, client_name, site_address, suburb, scheduled_date, scheduled_end_date, scheduled_time_start, scheduled_time_end")
      .eq("id", installation_id)
      .single();

    if (instError || !installation) {
      return new Response(JSON.stringify({ error: "Installation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch assigned installer names
    const { data: assigned } = await supabase
      .from("installation_installers")
      .select("team_member")
      .eq("installation_id", installation_id);

    const installerNames: string[] = (assigned ?? []).map((r: any) => r.team_member);
    if (installerNames.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No installers assigned" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles with whatsapp_phone for those names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("display_name, whatsapp_phone")
      .in("display_name", installerNames)
      .not("whatsapp_phone", "is", null);

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const twilioAuthToken  = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const twilioWhatsAppFrom = Deno.env.get("TWILIO_WHATSAPP_FROM")!; // e.g. whatsapp:+14155238886

    const fmtD = (iso: string) =>
      new Date(iso).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const dateStr = installation.scheduled_date ? fmtD(installation.scheduled_date) : "TBC";
    const endDateStr = installation.scheduled_end_date ? fmtD(installation.scheduled_end_date) : null;
    const dateRange = endDateStr && endDateStr !== dateStr ? `${dateStr} → ${endDateStr}` : dateStr;
    const timeStr = [installation.scheduled_time_start, installation.scheduled_time_end].filter(Boolean).join(" – ");
    const location = [installation.suburb, installation.site_address].filter(Boolean).join(", ") || "—";

    let sent = 0;
    const errors: string[] = [];

    for (const profile of profiles ?? []) {
      const phone = profile.whatsapp_phone!.replace(/\s+/g, "");
      const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
      const name = profile.display_name ?? "Team member";

      const body = `Hi ${name} 👋\n\nYou have been scheduled for an installation:\n\n📋 *${installation.title}*\n👤 Client: ${installation.client_name ?? "—"}\n📍 ${location}\n📅 ${dateRange}${timeStr ? `\n⏰ ${timeStr}` : ""}\n\nPlease confirm receipt. — Wonderland Collective`;

      const params = new URLSearchParams({
        From: twilioWhatsAppFrom,
        To: to,
        Body: body,
      });

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          },
          body: params.toString(),
        }
      );

      if (twilioRes.ok) {
        sent++;
      } else {
        const errBody = await twilioRes.text();
        errors.push(`${name}: ${errBody}`);
      }
    }

    return new Response(JSON.stringify({ sent, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
