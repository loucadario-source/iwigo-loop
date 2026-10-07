import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      error: "Génération vidéo Veo désactivée définitivement pour des raisons budgétaires. La stratégie IWIGO repose exclusivement sur les visuels et carrousels statiques Imagen 3 haute définition.",
      code: "VIDEO_GENERATION_DISABLED",
    },
    { status: 403 }
  );
}
