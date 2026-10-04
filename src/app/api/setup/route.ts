import { NextResponse, type NextRequest } from "next/server";
import { inngest } from "@/inngest/client";

/** Déclenche le bootstrap (Brand Scout + Contexte Local) puis la 1re boucle. */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token") ?? req.cookies.get("iwigo_admin")?.value;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { kind } = (await req.json().catch(() => ({}))) as { kind?: "bootstrap" | "tick" };
  await inngest.send({ name: kind === "tick" ? "loop/tick" : "system/bootstrap", data: { reason: "manual" } });
  return NextResponse.json({ ok: true, triggered: kind ?? "bootstrap" });
}
