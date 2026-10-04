import { createHash } from "crypto";
import { z } from "zod";
import { llmJson } from "@/lib/llm";
import { db, logRun } from "@/lib/supabase";

/**
 * AGENT TREND & NEWS HUNTER
 * Sources : Google News RSS (requêtes ciblées), flux institutionnels, requêtes "viral" TikTok/Reels via Google News.
 * Puis scoring LLM par lot : pilier, pertinence, angle, caractère réglementaire.
 */

const gnews = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`;

export const FEEDS: Array<{ source: string; url: string }> = [
  { source: "gnews:reforme-permis", url: gnews("réforme permis de conduire when:14d") },
  { source: "gnews:permis-17-ans", url: gnews("permis 17 ans when:30d") },
  { source: "gnews:cpf-permis", url: gnews("CPF permis de conduire when:30d") },
  { source: "gnews:aides-permis", url: gnews("aide permis de conduire Seine-et-Marne OR \"Île-de-France\" when:60d") },
  { source: "gnews:examen-code", url: gnews("examen code de la route nouveauté when:30d") },
  { source: "gnews:securite-routiere", url: gnews("sécurité routière jeunes conducteurs when:14d") },
  { source: "gnews:local-77", url: gnews("Melun OR Savigny-le-Temple OR \"Saint-Pierre-du-Perray\" route OR circulation when:14d") },
  { source: "gnews:viral-autoecole", url: gnews("auto-école TikTok OR Reels viral when:30d") },
  { source: "rss:securite-routiere", url: "https://www.securite-routiere.gouv.fr/rss.xml" },
  { source: "rss:service-public", url: "https://www.service-public.fr/abonnements/rss/actu-actu-transports.rss" },
];

interface RawItem { source: string; title: string; link: string; description: string }

const strip = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();

async function readFeed(f: { source: string; url: string }): Promise<RawItem[]> {
  try {
    const r = await fetch(f.url, { signal: AbortSignal.timeout(15000), headers: { "user-agent": "IWIGO-Loop/1.0" } });
    if (!r.ok) return [];
    const xml = await r.text();
    return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map((m) => ({
      source: f.source,
      title: strip(m[1].match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? ""),
      link: strip(m[1].match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? ""),
      description: strip(m[1].match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? "").slice(0, 400),
    })).filter((i) => i.title);
  } catch {
    return [];
  }
}

const Scored = z.object({
  items: z.array(z.object({
    i: z.number(),
    keep: z.boolean(),
    pillar: z.enum(["acquisition", "fidelisation", "actualite"]),
    relevance_score: z.number().min(0).max(100),
    suggested_angle: z.string(),
    is_regulatory: z.boolean(),
    summary: z.string(),
  })),
});

const SYSTEM = `Tu es le veilleur éditorial d'IWIGO, réseau de 4 auto-écoles ECF (Melun, Savigny-le-Temple, Le Châtelet-en-Brie, Saint-Pierre-du-Perray).
Classe chaque actualité selon 3 piliers :
- acquisition : attirer de nouveaux élèves 15-25 ans (permis 17 ans, AAC dès 15 ans, CPF, boîte auto, formats viraux, local).
- fidelisation : pédagogie pour élèves actuels/anciens (éco-conduite, pièges d'examen, panneaux, sécurité).
- actualite : réformes, barèmes, aides régionales/départementales, réglementation.
Rejette (keep=false) : faits divers sans angle pédagogique, accidents mortels sensationnalistes, sujets hors permis/mobilité, doublons.
relevance_score : utilité pour créer un contenu social IWIGO cette semaine.
Réponds en JSON : {"items":[{"i","keep","pillar","relevance_score","suggested_angle","is_regulatory","summary"}]}`;

export async function runTrendHunter(): Promise<number> {
  return logRun("trend_hunter", async () => {
    const raw = (await Promise.all(FEEDS.map(readFeed))).flat();
    const withHash = raw.map((r) => ({ ...r, hash: createHash("sha256").update(r.title.toLowerCase().slice(0, 120)).digest("hex") }));
    const unique = [...new Map(withHash.map((r) => [r.hash, r])).values()];

    const { data: existing } = await db().from("trends").select("dedup_hash").in("dedup_hash", unique.map((u) => u.hash));
    const known = new Set((existing ?? []).map((e) => e.dedup_hash));
    const fresh = unique.filter((u) => !known.has(u.hash)).slice(0, 40);
    if (!fresh.length) return { items: 0, result: 0 };

    const scored = await llmJson(Scored, {
      fast: true,
      temperature: 0.1,
      system: SYSTEM,
      user: fresh.map((f, i) => `[${i}] (${f.source}) ${f.title} — ${f.description}`).join("\n"),
    });

    const rows = scored.items
      .filter((s) => s.keep && fresh[s.i])
      .map((s) => ({
        source: fresh[s.i].source,
        source_url: fresh[s.i].link,
        title: fresh[s.i].title,
        summary: s.summary,
        pillar: s.pillar,
        relevance_score: Math.round(s.relevance_score),
        suggested_angle: s.suggested_angle,
        is_regulatory: s.is_regulatory,
        dedup_hash: fresh[s.i].hash,
      }));
    if (rows.length) {
      const { error } = await db().from("trends").upsert(rows, { onConflict: "dedup_hash", ignoreDuplicates: true });
      if (error) throw error;
    }
    return { items: rows.length, detail: { fetched: raw.length, fresh: fresh.length }, result: rows.length };
  });
}
