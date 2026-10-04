import { NextResponse, type NextRequest } from "next/server";
import { inngest } from "@/inngest/client";
import { getLeadgen, getProfileName, verifySignature } from "@/lib/meta";
import type { IncomingLead } from "@/agents/lead-classifier";

/** Vérification du webhook (Meta App Dashboard). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(p.get("hub.challenge"), { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

const CONVERSION = /prix|tarif|info|dispo|inscri|combien|permis|cpf|code|conduite|heure|devis|rdv|rendez|accompagn|boite|boîte|point/i;

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return new NextResponse("bad signature", { status: 401 });
  const body = JSON.parse(raw);
  const leads: IncomingLead[] = [];
  const isIG = body.object === "instagram";

  for (const entry of body.entry ?? []) {
    // Messenger / Instagram DM (+ réponses aux stories)
    for (const ev of entry.messaging ?? []) {
      if (!ev.message?.text || ev.message.is_echo) continue;
      const story = !!ev.message.reply_to?.story;
      leads.push({
        source: isIG ? (story ? "ig_story_reply" : "ig_dm") : "fb_messenger",
        meta_user_id: ev.sender?.id,
        full_name: isIG ? null : await getProfileName(ev.sender?.id),
        message: ev.message.text,
        raw: ev,
      });
    }
    for (const ch of entry.changes ?? []) {
      const v = ch.value ?? {};
      // Lead Ads
      if (ch.field === "leadgen" && v.leadgen_id) {
        const lg = await getLeadgen(v.leadgen_id).catch(() => null);
        const fields: Record<string, string> = Object.fromEntries((lg?.field_data ?? []).map((f: any) => [f.name, (f.values ?? []).join(", ")]));
        leads.push({ source: "meta_lead_ad", leadgen_id: v.leadgen_id, full_name: fields.full_name ?? null, message: "Formulaire Lead Ads", fields, raw: v });
      }
      // Commentaires IG
      if (ch.field === "comments" && v.text && CONVERSION.test(v.text)) {
        leads.push({ source: "ig_comment", meta_user_id: v.from?.id, full_name: v.from?.username ?? null, message: v.text, raw: v });
      }
      // Commentaires FB
      if (ch.field === "feed" && v.item === "comment" && v.verb === "add" && v.message && CONVERSION.test(v.message)) {
        leads.push({ source: "fb_comment", meta_user_id: v.from?.id, full_name: v.from?.name ?? null, message: v.message, raw: v });
      }
    }
  }

  if (leads.length) await inngest.send(leads.map((l) => ({ name: "lead/received", data: l as unknown as Record<string, unknown> })));
  return NextResponse.json({ ok: true, queued: leads.length }); // réponse rapide < 20 s exigée par Meta
}
