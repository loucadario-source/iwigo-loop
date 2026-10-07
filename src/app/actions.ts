"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { reviewContent } from "@/lib/review";
import { db } from "@/lib/supabase";
import { inngest } from "@/inngest/client";

function checkAdmin(): boolean {
  const cookie = cookies().get("iwigo_admin")?.value;
  return !!cookie && cookie === process.env.ADMIN_TOKEN;
}

function assertAdmin() {
  if (!checkAdmin()) {
    redirect("/login?expired=1");
  }
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
  if (!checkAdmin()) {
    redirect("/login?expired=1");
  }
  const caption = form.get("caption");
  try {
    await reviewContent({
      contentId: String(form.get("id")),
      decision: String(form.get("decision")),
      reviewer: "dashboard",
      note: String(form.get("note") ?? "") || undefined,
      patch: typeof caption === "string" ? { caption } : undefined,
    });
  } catch (err) {
    console.error("reviewContent failed:", err);
  }
  revalidatePath("/review");
  revalidatePath("/");
}

export async function markPublishedManually(form: FormData) {
  assertAdmin();
  try {
    await db().from("contents").update({ status: "published", published_at: new Date().toISOString() }).eq("id", String(form.get("id"))).eq("status", "approved");
  } catch (err) {
    console.error("markPublishedManually failed:", err);
  }
  revalidatePath("/review");
}

export async function publishToSocialsAction(form: FormData) {
  assertAdmin();
  const id = String(form.get("id"));
  try {
    const { publishContent } = await import("@/lib/meta");
    await publishContent(id);
  } catch (err) {
    console.error("publishContent failed:", err);
  }
  revalidatePath("/review");
  revalidatePath("/");
}


export async function moveLead(id: string, stage: "nouveau" | "contacte" | "inscrit" | "perdu") {
  assertAdmin();
  try {
    const extra = stage === "contacte" ? { contacted_at: new Date().toISOString() } : stage === "inscrit" ? { enrolled_at: new Date().toISOString() } : {};
    await db().from("leads").update({ stage, ...extra }).eq("id", id);
  } catch (err) {
    console.error("moveLead failed:", err);
  }
  revalidatePath("/leads");
}

export async function trigger(form: FormData) {
  assertAdmin();
  const kind = String(form.get("kind"));
  try {
    await inngest.send({ name: kind === "tick" ? "loop/tick" : "system/bootstrap", data: { reason: "dashboard" } });
  } catch (err) {
    console.error("trigger inngest failed:", err);
  }
  revalidatePath("/");
}

export async function generatePostNowAction() {
  assertAdmin();
  const { runContentCreator } = await import("@/agents/content-creator");
  try {
    await runContentCreator(1);
  } catch (err) {
    console.error("Direct runContentCreator failed, triggering via Inngest:", err);
    try {
      await inngest.send({ name: "loop/tick", data: { reason: "manual_click" } });
    } catch (e) {
      console.error("Inngest fallback failed:", e);
    }
  }
  revalidatePath("/review");
  revalidatePath("/");
}

