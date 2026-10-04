import { z } from "zod";
import { promises as fs } from "fs";
import path from "path";
import { llmJson } from "@/lib/llm";
import { db, logRun } from "@/lib/supabase";
import { BrandProfile, SEED_BRAND, type BrandProfile as Brand } from "@/lib/brand";

/**
 * AGENT BRAND SCOUT
 * 1. Crawl des sites ECF / IWIGO (HTML + CSS liés).
 * 2. Extraction déterministe : couleurs hex (fréquence), font-family, logos (svg/png "logo").
 * 3. Synthèse LLM → profil de charte validé par Zod.
 * 4. Persistance (brand_profiles, version++) + écriture de brand.generated.json (dev) pour Tailwind.
 */

const UA = { "user-agent": "Mozilla/5.0 (IWIGO-Loop BrandScout)" };

async function fetchText(url: string): Promise<string> {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
    return r.ok ? await r.text() : "";
  } catch {
    return "";
  }
}

function abs(base: string, href: string) {
  try { return new URL(href, base).toString(); } catch { return null; }
}

export interface SiteSignals {
  url: string;
  colors: Array<[string, number]>;
  fonts: string[];
  logos: string[];
  title: string;
}

export async function scanSite(url: string): Promise<SiteSignals | null> {
  const html = await fetchText(url);
  if (!html) return null;
  const cssLinks = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*href=["']([^"']+)["']/gi)]
    .map((m) => abs(url, m[1])).filter(Boolean).slice(0, 6) as string[];
  const css = (await Promise.all(cssLinks.map(fetchText))).join("\n");
  const blob = html + "\n" + css;

  const counts = new Map<string, number>();
  for (const m of blob.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    let h = m[1].toLowerCase();
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (["ffffff", "000000"].includes(h)) continue;
    counts.set("#" + h, (counts.get("#" + h) ?? 0) + 1);
  }
  const colors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);

  const fonts = [...new Set(
    [...blob.matchAll(/font-family\s*:\s*([^;}"]+)/gi)]
      .map((m) => m[1].split(",")[0].replace(/['"]/g, "").trim())
      .filter((f) => f && !/inherit|var\(|sans-serif|serif|monospace/i.test(f)),
  )].slice(0, 10);
  for (const m of html.matchAll(/fonts\.googleapis\.com\/css2?\?family=([^"&:]+)/gi)) fonts.unshift(decodeURIComponent(m[1]).replace(/\+/g, " "));

  const logos = [...new Set(
    [...html.matchAll(/(?:src|href)=["']([^"']*logo[^"']*\.(?:svg|png|webp))["']/gi)]
      .map((m) => abs(url, m[1])).filter(Boolean) as string[],
  )].slice(0, 5);

  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  return { url, colors, fonts: [...new Set(fonts)], logos, title };
}

const SYSTEM = `Tu es un directeur artistique. À partir de signaux extraits de sites web (couleurs CSS par fréquence, polices, logos),
tu reconstruis la charte graphique combinée "ECF (réseau national d'auto-écoles, identité institutionnelle bleu/rouge)" + "IWIGO (auto-école locale, membre ECF)".
Règles :
- Privilégie les couleurs réellement observées et fréquentes ; ECF = bleu institutionnel + rouge. Si IWIGO n'a pas de signal, dérive un accent cohérent.
- Garantis un contraste AA entre texte blanc et palette.ecf.primary.
- Polices : uniquement des polices disponibles sur Google Fonts ; si la police officielle est propriétaire, choisis l'équivalent Google Fonts le plus proche.
- logos : URL absolue observée ou null. N'invente aucune URL.
Réponds en JSON strict au format :
{"palette":{"ecf":{"primary","secondary","light"},"iwigo":{"primary","accent"},"neutral":{"dark","mid","light","white"}},
 "fonts":{"heading","body"},"logos":{"ecf","iwigo"},"tone":{"keywords":[...],"signature":"IWIGO — Auto-école ECF"},"rationale":"..."}`;

const LlmOut = BrandProfile.pick({ palette: true, fonts: true, logos: true, tone: true }).extend({ rationale: z.string().optional() });

export async function runBrandScout(): Promise<Brand> {
  return logRun("brand_scout", async () => {
    const sources = (process.env.BRAND_SOURCES ?? "https://www.ecf.asso.fr,https://www.iwigo.fr").split(",").map((s) => s.trim()).filter(Boolean);
    const signals = (await Promise.all(sources.map(scanSite))).filter(Boolean) as SiteSignals[];

    const out = await llmJson(LlmOut, {
      system: SYSTEM,
      user: `Signaux collectés :\n${JSON.stringify(signals, null, 1).slice(0, 12000)}\n\nCharte de repli actuelle :\n${JSON.stringify(SEED_BRAND.palette)}`,
      temperature: 0.2,
    });

    const { data: last } = await db().from("brand_profiles").select("version").order("version", { ascending: false }).limit(1).maybeSingle();
    const profile: Brand = BrandProfile.parse({
      ...out,
      version: (last?.version ?? 0) + 1,
      generated_by: "agent:brand_scout",
      generated_at: new Date().toISOString(),
      sources: signals.map((s) => s.url),
    });

    await db().from("brand_profiles").update({ is_active: false }).eq("is_active", true);
    await db().from("brand_profiles").insert({ version: profile.version, profile, is_active: true });

    // En local : régénère la config consommée par tailwind.config.ts (FS en lecture seule sur Vercel → ignoré).
    try {
      await fs.writeFile(path.join(process.cwd(), "src/brand/brand.generated.json"), JSON.stringify(profile, null, 2));
    } catch { /* noop */ }

    return { items: signals.length, detail: { sources: profile.sources, rationale: out.rationale }, result: profile };
  });
}
