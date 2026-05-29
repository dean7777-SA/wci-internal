import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
