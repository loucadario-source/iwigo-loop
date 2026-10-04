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
  try {
    const monday = getMondayThisWeek().toISOString();

    const { data: contents } = await db()
      .from("contents")
      .select("id,created_at,body")
      .not("body->video_url", "is", null);

    const generatedThisWeek = (contents ?? []).filter((item) => {
      const b = item.body as { video_url?: string; video_generated_at?: string };
      if (!b?.video_url) return false;
      const genDate = b.video_generated_at || item.created_at;
      return genDate >= monday;
    });

    const countThisWeek = generatedThisWeek.length;
    const maxPerWeek = 1;
    const remaining = Math.max(0, maxPerWeek - countThisWeek);

    return NextResponse.json({
      countThisWeek,
      maxPerWeek,
      remaining,
      canGenerate: remaining > 0,
      resetsAt: getNextMonday().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
