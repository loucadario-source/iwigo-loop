import { z } from "zod";
import { llmJson } from "@/lib/llm";
import { db, logRun } from "@/lib/supabase";
import { getActiveBrand } from "@/lib/brand";
import { AGENCIES, localHashtags } from "@/agents/local-context";
import { BRAND_CRITIC_SYSTEM, contentCreatorSystem } from "@/prompts/content";

/**
 * AGENT CONTENT CREATOR (+ Brand Critic en boucle interne)
 * Sélection des tendances selon le mix éditorial → génération → critique → (régénération si score < 7, max 2) → file de validation.
 */

export type Pillar = "acquisition" | "fidelisation" | "actualite";
export type Format = "carousel" | "reel_script" | "static_post";

const Slide = z.object({
  layout: z.enum(["hook", "tip", "quiz", "stat", "cta"]),
  title: z.string(),
  text: z.string().default(""),
  image_prompt: z.string().optional(),
});
const Body = z.union([
  z.object({ slides: z.array(Slide).min(3).max(10) }),
  z.object({
    duration_s: z.number(),
    hook: z.object({ on_screen_text: z.string(), voiceover: z.string() }),
    beats: z.array(z.object({ t: z.string(), shot: z.string(), on_screen_text: z.string(), voiceover: z.string() })),
    cta: z.string(),
    audio_suggestion: z.string().optional(),
    cover_image_prompt: z.string().optional(),
    veo_video_prompt: z.string().optional(),
  }),
  z.object({ layout: z.enum(["hook", "stat", "tip"]), headline: z.string(), subline: z.string(), image_prompt: z.string().optional() }),
]);
export const Generated = z.object({
  title: z.string(),
  body: Body,
  caption: z.string(),
  hashtags: z.array(z.string()),
  cta: z.string(),
  sources: z.array(z.string()).default([]),
  needs_fact_check: z.boolean().default(false),
});
export type Generated = z.infer<typeof Generated>;
const Critique = z.object({ score: z.number(), violations: z.array(z.string()), fix_instructions: z.string() });

const MIX: Record<Pillar, number> = { acquisition: 0.4, fidelisation: 0.4, actualite: 0.2 };
const FORMAT_BY_PILLAR: Record<Pillar, Format[]> = {
  acquisition: ["reel_script", "carousel", "static_post"],
  fidelisation: ["carousel", "reel_script", "static_post"],
  actualite: ["carousel", "static_post"],
};

interface TrendRow { id: string; title: string; summary: string | null; source_url: string | null; pillar: Pillar; suggested_angle: string | null; is_regulatory: boolean }

async function context() {
  const since = new Date(Date.now() - 14 * 864e5).toISOString();
  const [{ data: recent }, { data: feedback }] = await Promise.all([
    db().from("contents").select("title,pillar,format").gte("created_at", since).order("created_at", { ascending: false }).limit(30),
    db().from("contents").select("title,review_note,status").in("status", ["rejected", "changes_requested"]).not("review_note", "is", null).order("reviewed_at", { ascending: false }).limit(8),
  ]);
  return { recent: recent ?? [], feedback: feedback ?? [] };
}

async function pickPlan(n: number): Promise<Array<{ pillar: Pillar; trend: TrendRow | null }>> {
  const { recent } = await context();
  const counts: Record<Pillar, number> = { acquisition: 0, fidelisation: 0, actualite: 0 };
  recent.forEach((r) => (counts[r.pillar as Pillar] += 1));
  const total = Math.max(recent.length, 1);
  const plan: Array<{ pillar: Pillar; trend: TrendRow | null }> = [];
  for (let k = 0; k < n; k++) {
    // pilier le plus en retard sur l'objectif de mix
    const pillar = (Object.keys(MIX) as Pillar[]).sort((a, b) => (counts[a] / total - MIX[a]) - (counts[b] / total - MIX[b]))[0];
    counts[pillar] += 1;
    const used = plan.map((p) => p.trend?.id).filter(Boolean) as string[];
    let q = db().from("trends").select("id,title,summary,source_url,pillar,suggested_angle,is_regulatory").eq("status", "new").eq("pillar", pillar).order("relevance_score", { ascending: false }).limit(1);
    if (used.length) q = q.not("id", "in", `(${used.join(",")})`);
    const { data } = await q;
    plan.push({ pillar, trend: (data?.[0] as TrendRow) ?? null }); // fidelisation peut tourner sans tendance (pédagogie evergreen)
  }
  return plan;
}

export interface GenerateArgs { pillar: Pillar; format?: Format; trend: TrendRow | null; agencySlug?: string | null; revisionNote?: string; parent?: { id: string; version: number; title: string; body: unknown; caption: string | null } }

export async function generateOne(a: GenerateArgs) {
  const brand = await getActiveBrand();
  const { recent, feedback } = await context();
  const format = a.format ?? FORMAT_BY_PILLAR[a.pillar][Math.floor(Math.random() * FORMAT_BY_PILLAR[a.pillar].length)];
  const agency = AGENCIES.find((x) => x.slug === a.agencySlug) ?? AGENCIES[Math.floor(Math.random() * AGENCIES.length)];
  const system = contentCreatorSystem(brand, AGENCIES);

  let user = `Pilier : ${a.pillar}
Format : ${format}
Agence mise en avant : ${agency.city} (${agency.postal_code}) — hashtags locaux suggérés : ${localHashtags(agency).join(" ")}
${a.trend ? `Tendance / source :\n"""\n${a.trend.title}\n${a.trend.summary ?? ""}\nAngle suggéré : ${a.trend.suggested_angle ?? "-"}\nSource : ${a.trend.source_url ?? "-"}\n"""` : "Pas de tendance : produis un contenu pédagogique evergreen (code / conduite / sécurité)."}
Contenus des 14 derniers jours (ne pas répéter) : ${recent.map((r) => r.title).join(" | ") || "aucun"}
Retours humains récents à appliquer : ${feedback.map((f) => `"${f.title}" → ${f.review_note}`).join(" | ") || "aucun"}`;
  if (a.parent && a.revisionNote) {
    user += `\n\nRÉVISION DEMANDÉE par le validateur : "${a.revisionNote}"\nVersion précédente :\n${JSON.stringify({ title: a.parent.title, body: a.parent.body, caption: a.parent.caption })}`;
  }

  let gen = await llmJson(Generated, { system, user, temperature: 0.8 });
  let critique = await llmJson(Critique, { system: BRAND_CRITIC_SYSTEM, user: `Format: ${format}\nSource: ${a.trend?.summary ?? "evergreen"}\nContenu:\n${JSON.stringify(gen)}`, fast: true, temperature: 0 });
  for (let i = 0; i < 2 && critique.score < 7; i++) {
    gen = await llmJson(Generated, { system, user: `${user}\n\nCORRECTIONS OBLIGATOIRES (critique charte, score ${critique.score}/10) : ${critique.violations.join("; ")}. ${critique.fix_instructions}\nVersion à corriger :\n${JSON.stringify(gen)}`, temperature: 0.5 });
    critique = await llmJson(Critique, { system: BRAND_CRITIC_SYSTEM, user: `Format: ${format}\nContenu:\n${JSON.stringify(gen)}`, fast: true, temperature: 0 });
  }

  const { data, error } = await db().from("contents").insert({
    trend_id: a.trend?.id ?? null,
    parent_id: a.parent?.id ?? null,
    version: (a.parent?.version ?? 0) + 1,
    pillar: a.pillar,
    format,
    agency_slug: agency.slug,
    title: gen.title,
    body: gen.body,
    caption: gen.caption,
    hashtags: gen.hashtags,
    cta: gen.cta,
    sources: gen.sources?.length ? gen.sources : a.trend?.source_url ? [a.trend.source_url] : [],
    needs_fact_check: gen.needs_fact_check || !!a.trend?.is_regulatory,
    brand_check: critique,
    brand_version: brand.version,
    status: "pending_review",
    prompt_snapshot: { provider: process.env.LLM_PROVIDER, model: process.env.LLM_MODEL, user },
  }).select("*").single();
  if (error) throw error;
  if (a.trend) await db().from("trends").update({ status: "used" }).eq("id", a.trend.id);
  return data as ContentRow;
}

export interface ContentRow {
  id: string; title: string; pillar: Pillar; format: Format; agency_slug: string | null; body: Generated["body"];
  caption: string | null; hashtags: string[]; cta: string | null; sources: string[]; needs_fact_check: boolean;
  brand_check: { score: number; violations: string[] } | null; status: string; version: number; telegram_message_id: number | null;
  approved_by: string | null; review_note: string | null; created_at: string; parent_id: string | null; trend_id: string | null;
}

export async function runContentCreator(n = Number(process.env.CONTENTS_PER_RUN ?? 3)): Promise<ContentRow[]> {
  return logRun("content_creator", async () => {
    const plan = await pickPlan(n);
    const out: ContentRow[] = [];
    for (const p of plan) {
      if (!p.trend && p.pillar === "actualite") continue; // pas d'actu inventée
      out.push(await generateOne({ pillar: p.pillar, trend: p.trend }));
    }
    return { items: out.length, result: out };
  });
}
