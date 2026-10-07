import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function getMondayThisWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function getNextMonday(): Date {
  const monday = getMondayThisWeek();
  const next = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);
  return next;
}

export async function GET() {
  return NextResponse.json({
    countThisWeek: 0,
    maxPerWeek: 0,
    remaining: 0,
    canGenerate: false,
    resetsAt: null,
    disabled: true,
    message: "Génération vidéo désactivée. Production axée sur les visuels et carrousels fixes Imagen 3.",
  });
}
