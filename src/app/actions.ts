"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { reviewContent } from "@/lib/review";
import { db } from "@/lib/supabase";
import { inngest } from "@/inngest/client";

function assertAdmin() {
  if (cookies().get("iwigo_admin")?.value !== process.env.ADMIN_TOKEN) throw new Error("unauthorized");
}

export async function login(form: FormData) {
  const token = String(form.get("token") ?? "");
  const next = String(form.get("next") ?? "/") || "/";
  if (token && token === process.env.ADMIN_TOKEN) {
    cookies().set("iwigo_admin", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 30 });
    redirect(next.startsWith("/") ? next : "/");
  }
  redirect("/login?error=1");
}

export async function reviewAction(form: FormData) {
  assertAdmin();
  const caption = form.get("caption");
  await reviewContent({
    contentId: String(form.get("id")),
    decision: String(form.get("decision")),
    reviewer: "dashboard",
    note: String(form.get("note") ?? "") || undefined,
    patch: typeof caption === "string" ? { caption } : undefined,
  });
  revalidatePath("/review");
}

export async function markPublishedManually(form: FormData) {
  assertAdmin();
  await db().from("contents").update({ status: "published", published_at: new Date().toISOString() }).eq("id", String(form.get("id"))).eq("status", "approved");
  revalidatePath("/review");
}

export async function moveLead(id: string, stage: "nouveau" | "contacte" | "inscrit" | "perdu") {
  assertAdmin();
  const extra = stage === "contacte" ? { contacted_at: new Date().toISOString() } : stage === "inscrit" ? { enrolled_at: new Date().toISOString() } : {};
  await db().from("leads").update({ stage, ...extra }).eq("id", id);
  revalidatePath("/leads");
}

export async function trigger(form: FormData) {
  assertAdmin();
  const kind = String(form.get("kind"));
  await inngest.send({ name: kind === "tick" ? "loop/tick" : "system/bootstrap", data: { reason: "dashboard" } });
  revalidatePath("/");
}

export async function generatePostNowAction() {
  assertAdmin();
  const { runContentCreator } = await import("@/agents/content-creator");
  try {
    await runContentCreator(1);
  } catch (err) {
    console.error("Direct runContentCreator failed, triggering via Inngest:", err);
    await inngest.send({ name: "loop/tick", data: { reason: "manual_click" } });
  }
  revalidatePath("/review");
  revalidatePath("/");
}

