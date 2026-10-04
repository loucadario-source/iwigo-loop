import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { renderSlide, toSlides } from "@/agents/visual-renderer";
import type { ContentRow } from "@/agents/content-creator";

/** PNG d'une slide (aperçu dashboard, téléchargement, et image_url pour la Graph API Meta). */
export async function GET(req: Request, { params }: { params: { id: string; slide: string } }) {
  const { data: c } = await db().from("contents").select("*").eq("id", params.id).maybeSingle<ContentRow>();
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const spec = toSlides(c)[Number(params.slide)];
  if (!spec) return NextResponse.json({ error: "slide" }, { status: 404 });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode"); // 'photo' | 'text' | auto

  if (mode === "text") {
    spec.imageData = null;
    spec.imagePrompt = undefined;
  } else if (mode === "photo") {
    // Si le slide n'a pas de prompt explicite, on génère un prompt photo contextuel ultra-précis
    if (!spec.imagePrompt) {
      spec.imagePrompt = `Atmospheric scene about ${c.title}, ${spec.title}: realistic photo in a French street or inside a modern driving school car, young driver, professional high aesthetic photography`;
    }
  }

  const img = await renderSlide(spec);
  img.headers.set("cache-control", "public, max-age=300");
  img.headers.set("content-disposition", `inline; filename="iwigo-${c.id.slice(0, 8)}-${Number(params.slide) + 1}.png"`);
  return img;
}
