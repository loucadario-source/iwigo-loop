import type { ContentRow } from "@/agents/content-creator";
import { AGENCIES } from "@/agents/local-context";

const api = (method: string) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;

async function call(method: string, body: Record<string, unknown>) {
  const r = await fetch(api(method), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description}`);
  return j.result;
}

export const telegramEnabled = () => !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID;

export function isAllowed(userId: number) {
  const list = (process.env.TELEGRAM_ALLOWED_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return list.length === 0 || list.includes(String(userId));
}

const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);

export function reviewKeyboard(id: string) {
  return {
    inline_keyboard: [
      [{ text: "✅ Approuver", callback_data: `rv:a:${id}` }, { text: "❌ Rejeter", callback_data: `rv:r:${id}` }],
      [{ text: "🔄 Régénérer", callback_data: `rv:g:${id}` }, { text: "👁 Aperçu", url: `${process.env.APP_URL}/review?id=${id}` }],
    ],
  };
}

function summary(c: ContentRow) {
  const city = AGENCIES.find((a) => a.slug === c.agency_slug)?.city ?? "Réseau";
  const flags = [
    c.needs_fact_check ? "⚠️ <b>À vérifier (réglementaire)</b>" : "",
    c.brand_check ? `Charte : <b>${c.brand_check.score}/10</b>` : "",
  ].filter(Boolean).join(" · ");
  let script = "";
  if (c.format === "reel_script") {
    const b = c.body as { hook: { on_screen_text: string; voiceover: string }; beats: Array<{ t: string; voiceover: string }>; cta: string };
    script = `\n\n🎬 <b>Hook</b> : ${esc(b.hook.on_screen_text)}\n🗣 ${esc(b.hook.voiceover)}\n${b.beats.map((x) => `• ${esc(x.t)} — ${esc(x.voiceover)}`).join("\n")}\n📣 ${esc(b.cta)}`;
  }
  return `🆕 <b>${esc(c.title)}</b> (v${c.version})
${c.pillar} · ${c.format} · 📍 ${city}
${flags}${script}

${esc((c.caption ?? "").slice(0, 2500))}

${esc(c.hashtags.join(" "))}`.slice(0, 4000);
}

/** Envoie les visuels + la fiche de validation avec boutons inline. Retourne le message_id. */
export async function sendForReview(c: ContentRow, pngs: Buffer[]): Promise<number> {
  const chat = process.env.TELEGRAM_CHAT_ID!;
  if (pngs.length) {
    const form = new FormData();
    form.append("chat_id", chat);
    const media = pngs.slice(0, 10).map((_, i) => ({ type: "photo", media: `attach://p${i}` }));
    form.append("media", JSON.stringify(media));
    pngs.slice(0, 10).forEach((p, i) => form.append(`p${i}`, new Blob([new Uint8Array(p)], { type: "image/png" }), `slide${i + 1}.png`));
    await fetch(api(pngs.length > 1 ? "sendMediaGroup" : "sendPhoto"), {
      method: "POST",
      body: pngs.length > 1 ? form : (() => { const f = new FormData(); f.append("chat_id", chat); f.append("photo", new Blob([new Uint8Array(pngs[0])], { type: "image/png" }), "visuel.png"); return f; })(),
    });
  }
  const msg = await call("sendMessage", { chat_id: chat, text: summary(c), parse_mode: "HTML", reply_markup: reviewKeyboard(c.id), link_preview_options: { is_disabled: true } });
  return msg.message_id;
}

export async function markDecided(messageId: number, label: string) {
  await call("editMessageReplyMarkup", { chat_id: process.env.TELEGRAM_CHAT_ID, message_id: messageId, reply_markup: { inline_keyboard: [[{ text: label, callback_data: "noop" }]] } }).catch(() => {});
}

export async function answerCallback(id: string, text: string) {
  await call("answerCallbackQuery", { callback_query_id: id, text }).catch(() => {});
}

export async function askRegenerationNote(contentId: string) {
  await call("sendMessage", {
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: `🔄 Que faut-il changer ? Réponds à ce message (ou « - » pour régénérer sans consigne).\n#id:${contentId}`,
    reply_markup: { force_reply: true, selective: true },
  });
}

export async function notify(text: string, chatId = process.env.TELEGRAM_CHAT_ID) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return;
  await call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML" }).catch(() => {});
}
