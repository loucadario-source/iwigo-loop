import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const operationName = url.searchParams.get("op");
    const contentId = url.searchParams.get("contentId");

    if (!operationName || !contentId) {
      return NextResponse.json({ error: "Paramètres 'op' et 'contentId' requis" }, { status: 400 });
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "GEMINI_API_KEY non configurée" }, { status: 500 });
    }

    // Interroger le statut de l'opération VEO chez Google
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${key}`);
    const json = await res.json();

    if (!res.ok || json.error) {
      return NextResponse.json({ error: json.error?.message || "Erreur Google VEO" }, { status: 500 });
    }

    if (!json.done) {
      return NextResponse.json({ done: false });
    }

    // L'opération est terminée !
    const videoUri = json.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
    if (!videoUri) {
      return NextResponse.json({ error: "Aucun flux vidéo retourné par VEO" }, { status: 500 });
    }

    // Télécharger le MP4 généré
    const downloadUrl = `${videoUri}${videoUri.includes("?") ? "&" : "?"}key=${key}`;
    const videoRes = await fetch(downloadUrl);
    if (!videoRes.ok) {
      return NextResponse.json({ error: "Impossible de récupérer le fichier MP4 généré" }, { status: 500 });
    }

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

    // Sauvegarder dans le bucket Supabase Storage 'videos'
    const fileName = `${contentId}.mp4`;
    const { error: uploadError } = await db().storage.from("videos").upload(fileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });

    if (uploadError) {
      console.error("Erreur upload Supabase storage:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrlData } = db().storage.from("videos").getPublicUrl(fileName);
    const publicUrl = publicUrlData.publicUrl;

    // Mettre à jour le post dans la base de données
    const { data: currentContent } = await db().from("contents").select("body").eq("id", contentId).single();
    if (currentContent) {
      const updatedBody = { ...(currentContent.body as object), video_url: publicUrl };
      await db().from("contents").update({ body: updatedBody }).eq("id", contentId);
    }

    return NextResponse.json({
      done: true,
      videoUrl: publicUrl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
