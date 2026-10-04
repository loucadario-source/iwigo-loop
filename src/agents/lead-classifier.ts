import { z } from "zod";
import { llmJson } from "@/lib/llm";
import { db } from "@/lib/supabase";
import { AGENCIES, resolveAgency } from "@/agents/local-context";
import { notify } from "@/lib/telegram";

/** AGENT LEAD CLASSIFIER — catégorisation + attribution agence. */

export type LeadSource = "ig_dm" | "ig_comment" | "ig_story_reply" | "fb_messenger" | "fb_comment" | "meta_lead_ad";

export interface IncomingLead {
  source: LeadSource;
  meta_user_id?: string | null;
  full_name?: string | null;
  message: string;
  fields?: Record<string, string>;
  leadgen_id?: string | null;
  raw?: unknown;
}

const Out = z.object({
  is_lead: z.boolean(),
  category: z.enum(["permis_b", "boite_auto", "conduite_accompagnee", "cpf", "recuperation_points", "autre"]),
  confidence: z.number().min(0).max(1),
  city: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  intent_summary: z.string(),
});

const SYSTEM = `Tu qualifies les messages reçus par IWIGO, auto-écoles ECF (agences : ${AGENCIES.map((a) => a.city).join(", ")}).
Catégories : permis_b (permis B classique, boîte manuelle), boite_auto, conduite_accompagnee (AAC, 15-17 ans, parents), cpf (financement CPF),
recuperation_points (stage de récupération de points), autre.
is_lead=false pour spam, simple emoji, compliment sans intention, troll.
city : ville mentionnée ou null. phone/email : extraits ou null. intent_summary : 1 phrase en français.
Réponds en JSON : {"is_lead","category","confidence","city","phone","email","intent_summary"}`;

export async function classifyAndStoreLead(l: IncomingLead) {
  const text = [l.message, ...Object.entries(l.fields ?? {}).map(([k, v]) => `${k}: ${v}`)].join("\n");
  const c = await llmJson(Out, { system: SYSTEM, user: text.slice(0, 3000), fast: true, temperature: 0 });
  if (!c.is_lead && l.source !== "meta_lead_ad") return null;

  const agency = resolveAgency(c.city) ?? resolveAgency(text);
  const row = {
    meta_user_id: l.meta_user_id ?? null,
    source: l.source,
    full_name: l.full_name ?? l.fields?.full_name ?? null,
    phone: c.phone ?? l.fields?.phone_number ?? null,
    email: c.email ?? l.fields?.email ?? null,
    city: c.city ?? l.fields?.city ?? null,
    agency_slug: agency?.slug ?? null,
    category: c.category,
    category_confidence: c.confidence,
    intent_summary: c.intent_summary,
    first_message: l.message.slice(0, 2000),
    meta_leadgen_id: l.leadgen_id ?? null,
    last_interaction_at: new Date().toISOString(),
  };

  let leadId: string | null = null;
  if (l.meta_user_id) {
    const { data: ex } = await db().from("leads").select("id").eq("meta_user_id", l.meta_user_id).eq("source", l.source).maybeSingle();
    if (ex) {
      leadId = ex.id;
      // ne pas écraser le stage ni le premier message
      const { first_message: _f, ...upd } = row;
      await db().from("leads").update(Object.fromEntries(Object.entries(upd).filter(([, v]) => v !== null))).eq("id", ex.id);
    }
  }
  if (!leadId) {
    const { data, error } = await db().from("leads").insert(row).select("id").single();
    if (error) throw error;
    leadId = data.id;
    await notify(`🎯 <b>Nouveau lead</b> · ${c.category} · ${agency?.city ?? "agence ?"}\n${row.full_name ?? ""} ${row.phone ?? ""}\n<i>${c.intent_summary}</i>\n${process.env.APP_URL}/leads`);
  }
  await db().from("lead_interactions").insert({ lead_id: leadId, direction: "in", channel: l.source, message: l.message, raw: l.raw ?? null });
  return leadId;
}
