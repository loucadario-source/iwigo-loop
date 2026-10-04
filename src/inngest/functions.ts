import { inngest } from "@/inngest/client";
import { db } from "@/lib/supabase";
import { runBrandScout } from "@/agents/brand-scout";
import { runLocalContext } from "@/agents/local-context";
import { runTrendHunter } from "@/agents/trend-hunter";
import { generateOne, runContentCreator, type ContentRow, type Pillar, type Format } from "@/agents/content-creator";
import { renderContentPngs } from "@/agents/visual-renderer";
import { classifyAndStoreLead, type IncomingLead } from "@/agents/lead-classifier";
import { markDecided, notify, sendForReview, telegramEnabled } from "@/lib/telegram";
import { publishContent, publishEnabled } from "@/lib/meta";

/* ───────────── 1. BOOTSTRAP : Brand Scout ∥ Contexte Local ───────────── */
export const bootstrap = inngest.createFunction(
  { id: "system-bootstrap", concurrency: 1 },
  { event: "system/bootstrap" },
  async ({ step }) => {
    const [agencies, brand] = await Promise.all([
      step.run("agent-local-context", () => runLocalContext()),
      step.run("agent-brand-scout", () => runBrandScout()),
    ]);
    await step.sendEvent("kick-loop", { name: "loop/tick", data: { reason: "bootstrap" } });
    return { agencies: agencies.length, brandVersion: brand.version };
  },
);

/* Rafraîchissement mensuel de la charte (le site ECF peut évoluer). */
export const brandRefresh = inngest.createFunction(
  { id: "brand-refresh" },
  { cron: "0 4 1 * *" },
  async ({ step }) => step.run("agent-brand-scout", () => runBrandScout().then((b) => b.version)),
);

/* ───────────── 2. BOUCLE : Hunter → Creator → (Renderer + HITL par contenu) ───────────── */
export const loopCron = inngest.createFunction(
  { id: "loop-cron" },
  { cron: process.env.LOOP_CRON || "0 6 * * *" },
  async ({ step }) => step.sendEvent("tick", { name: "loop/tick", data: { reason: "cron" } }),
);

export const loopTick = inngest.createFunction(
  { id: "loop-tick", concurrency: 1 },
  { event: "loop/tick" },
  async ({ step }) => {
    const found = await step.run("agent-trend-hunter", () => runTrendHunter());
    // Garde-fou : ne pas empiler si la file de validation est déjà pleine.
    const pending = await step.run("count-pending", async () => {
      const { count } = await db().from("contents").select("id", { count: "exact", head: true }).eq("status", "pending_review");
      return count ?? 0;
    });
    if (pending >= 10) return { found, created: 0, skipped: "file de validation pleine" };
    const created = await step.run("agent-content-creator", () => runContentCreator());
    if (created.length) {
      await step.sendEvent("fan-out", created.map((c) => ({ name: "content/created" as const, data: { contentId: c.id } })));
    }
    return { found, created: created.length };
  },
);

/* Cycle de vie d'un contenu : rendu → Telegram → attente décision → action. Récursif via "Régénérer". */
export const contentLifecycle = inngest.createFunction(
  { id: "content-lifecycle" },
  { event: "content/created" },
  async ({ event, step }) => {
    const contentId = event.data.contentId as string;

    await step.run("agent-visual-renderer+telegram", async () => {
      const { data: c } = await db().from("contents").select("*").eq("id", contentId).single<ContentRow>();
      if (!c || !telegramEnabled()) return null;
      const pngs = await renderContentPngs(c);
      const messageId = await sendForReview(c, pngs);
      await db().from("contents").update({ telegram_message_id: messageId }).eq("id", contentId);
      return messageId;
    });

    const review = await step.waitForEvent("wait-human-review", {
      event: "content/reviewed",
      if: `async.data.contentId == "${contentId}"`,
      timeout: "72h",
    });

    if (!review) {
      await step.run("remind", () => notify(`⏰ Contenu en attente depuis 72 h : ${process.env.APP_URL}/review?id=${contentId}`));
      return { status: "timeout" };
    }

    const { decision, note } = review.data as { decision: "approve" | "reject" | "regenerate"; note: string | null };
    const msgId = await step.run("load-msg", async () => (await db().from("contents").select("telegram_message_id").eq("id", contentId).single()).data?.telegram_message_id as number | null);

    if (decision === "approve") {
      if (msgId) await step.run("mark", () => markDecided(msgId, "✅ Approuvé"));
      if (publishEnabled()) {
        const ids = await step.run("publish-meta", () => publishContent(contentId));
        await step.run("notify-published", () => notify(`🚀 Publié : ${JSON.stringify(ids)}`));
        return { status: "published" };
      }
      await step.run("notify-export", () => notify(`📦 Prêt à publier (export manuel) : ${process.env.APP_URL}/review?id=${contentId}&tab=approved`));
      return { status: "approved_manual_export" };
    }

    if (decision === "reject") {
      if (msgId) await step.run("mark", () => markDecided(msgId, `❌ Rejeté${note ? " : " + note.slice(0, 40) : ""}`));
      return { status: "rejected" }; // le motif est réinjecté dans les prompts suivants
    }

    // regenerate → nouvelle version, qui relance ce même cycle (boucle récursive)
    if (msgId) await step.run("mark", () => markDecided(msgId, "🔄 Régénération…"));
    const next = await step.run("agent-content-creator-revision", async () => {
      const { data: p } = await db().from("contents").select("*").eq("id", contentId).single<ContentRow>();
      if (!p) throw new Error("parent introuvable");
      const { data: trend } = p.trend_id ? await db().from("trends").select("id,title,summary,source_url,pillar,suggested_angle,is_regulatory").eq("id", p.trend_id).single() : { data: null };
      const c = await generateOne({ pillar: p.pillar as Pillar, format: p.format as Format, trend, agencySlug: p.agency_slug, revisionNote: note || "Propose une approche différente, plus percutante.", parent: p });
      return c.id;
    });
    await step.sendEvent("relaunch", { name: "content/created", data: { contentId: next } });
    return { status: "regenerated", next };
  },
);

/* ───────────── 3. LEADS META ───────────── */
export const leadReceived = inngest.createFunction(
  { id: "lead-received", retries: 3 },
  { event: "lead/received" },
  async ({ event, step }) => step.run("agent-lead-classifier", () => classifyAndStoreLead(event.data as IncomingLead)),
);

export const functions = [bootstrap, brandRefresh, loopCron, loopTick, contentLifecycle, leadReceived];
