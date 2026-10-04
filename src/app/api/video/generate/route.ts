import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { contentId, prompt } = await req.json();
    if (!contentId) {
      return NextResponse.json({ error: "contentId manquant" }, { status: 400 });
    }

    const { data: content, error } = await db()
      .from("contents")
      .select("*")
      .eq("id", contentId)
      .single();

    if (error || !content) {
      return NextResponse.json({ error: "Contenu introuvable" }, { status: 404 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "GEMINI_API_KEY non configurée" }, { status: 500 });
    }

    // VERROU STRICT : 1 VIDÉO PAR SEMAINE MAXIMUM
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const { data: allContents } = await db()
      .from("contents")
      .select("id,created_at,body")
      .not("body->video_url", "is", null);

    const generatedThisWeek = (allContents ?? []).filter((item) => {
      const bItem = item.body as { video_url?: string; video_generated_at?: string };
      if (!bItem?.video_url) return false;
      const genDate = bItem.video_generated_at || item.created_at;
      return genDate >= monday.toISOString();
    });

    const alreadyHasVideoOnThis = Boolean((content.body as { video_url?: string })?.video_url);
    if (generatedThisWeek.length >= 1 && !alreadyHasVideoOnThis) {
      return NextResponse.json(
        {
          error: "Quota hebdomadaire atteint (1 vidéo / semaine). Ce verrou garantit l'équilibre éditorial et la rentabilité du système. Prochaine vidéo disponible dès lundi.",
          quotaReached: true,
        },
        { status: 429 }
      );
    }

    const b = content.body as {
      hook?: { on_screen_text?: string; voiceover?: string };
      beats?: Array<{ shot?: string; voiceover?: string }>;
      veo_video_prompt?: string;
    };

    const { boostVeoPrompt } = await import("@/prompts/veo-expert");
    const { AGENCIES } = await import("@/agents/local-context");
    const agency = AGENCIES.find((a) => a.slug === content.agency_slug);
    const rawPrompt = prompt || b?.veo_video_prompt || content.title;

    const videoPrompt = rawPrompt.includes("STRICT ACCENT & VOICE REQUIREMENTS")
      ? rawPrompt
      : boostVeoPrompt(rawPrompt, {
          title: content.title,
          agencyCity: agency?.city,
          hookText: b?.hook?.on_screen_text,
          voiceoverText: b?.hook?.voiceover,
          beatsSummary: b?.beats?.map((x) => x.shot).join(", "),
        });

    // Appel à Google VEO 3.1
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: videoPrompt }],
          parameters: {
            aspectRatio: "9:16",
          },
        }),
      }
    );

    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json(
        { error: json.error?.message || "Erreur lors du lancement de VEO 3.1" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      operationName: json.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
