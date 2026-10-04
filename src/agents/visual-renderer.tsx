import { ImageResponse } from "next/og";
import { getActiveBrand } from "@/lib/brand";
import { AGENCIES } from "@/agents/local-context";
import { SIZE, SlideTemplate, loadGoogleFont, type SlideSpec } from "@/brand/templates";
import type { ContentRow } from "@/agents/content-creator";

/**
 * AGENT VISUAL RENDERER
 * Transforme un contenu (texte LLM) en specs de slides puis en PNG via les gabarits fixes.
 */

export function toSlides(c: Pick<ContentRow, "format" | "body" | "title" | "cta" | "agency_slug">): SlideSpec[] {
  const city = AGENCIES.find((a) => a.slug === c.agency_slug)?.city;
  const b = c.body as Record<string, unknown>;
  if (c.format === "carousel" && Array.isArray(b.slides)) {
    const slides = b.slides as Array<{ layout: SlideSpec["layout"]; title: string; text?: string; image_prompt?: string }>;
    return slides.map((s, i) => ({
      ...s,
      index: i,
      total: slides.length,
      agencyCity: city,
      imagePrompt: s.image_prompt,
    }));
  }
  if (c.format === "static_post") {
    return [
      {
        layout: (b.layout as SlideSpec["layout"]) ?? "hook",
        title: String(b.headline ?? c.title),
        text: String(b.subline ?? ""),
        index: 0,
        total: 1,
        agencyCity: city,
        imagePrompt: typeof b.image_prompt === "string" ? b.image_prompt : undefined,
      },
    ];
  }
  // reel_script → couverture (cover) du Reel
  const hook = b.hook as { on_screen_text?: string } | undefined;
  return [
    {
      layout: "hook",
      title: hook?.on_screen_text ?? c.title,
      text: "",
      index: 0,
      total: 1,
      agencyCity: city,
      imagePrompt: typeof b.cover_image_prompt === "string" ? b.cover_image_prompt : undefined,
    },
  ];
}

let fontCache: Promise<Array<{ name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }>> | null = null;
let fontKey = "";

async function fonts(heading: string, body: string) {
  const key = heading + "|" + body;
  if (!fontCache || fontKey !== key) {
    fontKey = key;
    fontCache = Promise.all([loadGoogleFont(heading, 800), loadGoogleFont(body, 400), loadGoogleFont(body, 800)]).then(([h, b4, b8]) => {
      const list: Array<{ name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }> = [];
      if (h) list.push({ name: "heading", data: h, weight: 800, style: "normal" });
      if (b4) list.push({ name: "body", data: b4, weight: 400, style: "normal" });
      if (b8) list.push({ name: "body", data: b8, weight: 800, style: "normal" });
      return list;
    });
  }
  return fontCache;
}

import { generateNanoBananaImage } from "@/agents/nano-banana";

export async function renderSlide(spec: SlideSpec): Promise<ImageResponse> {
  const brand = await getActiveBrand();
  // Si le slide demande un visuel photo/illustration, on appelle l'agent Nano Banana Pro
  if (spec.imagePrompt && !spec.imageData) {
    try {
      spec.imageData = await generateNanoBananaImage(spec.imagePrompt);
    } catch {
      spec.imageData = null;
    }
  }
  return new ImageResponse(<SlideTemplate b={brand} s={spec} />, { ...SIZE, fonts: await fonts(brand.fonts.heading, brand.fonts.body), emoji: "twemoji" });
}

export async function renderContentPngs(c: ContentRow): Promise<Buffer[]> {
  const specs = toSlides(c);
  return Promise.all(specs.map(async (s) => Buffer.from(await (await renderSlide(s)).arrayBuffer())));
}
