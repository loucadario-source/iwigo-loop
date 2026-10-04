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

    const videoPrompt = prompt || (content.body as { veo_video_prompt?: string })?.veo_video_prompt || content.title;

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
