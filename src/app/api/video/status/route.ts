import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "Génération vidéo Veo désactivée définitivement. Aucun traitement vidéo en cours.",
      code: "VIDEO_GENERATION_DISABLED",
    },
    { status: 403 }
  );
}
