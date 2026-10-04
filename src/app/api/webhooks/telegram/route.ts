import { NextResponse, type NextRequest } from "next/server";
import { reviewContent } from "@/lib/review";
import { answerCallback, askRegenerationNote, isAllowed, markDecided } from "@/lib/telegram";

interface Update {
  callback_query?: { id: string; from: { id: number; first_name?: string; username?: string }; data?: string };
  message?: { from?: { id: number; first_name?: string; username?: string }; text?: string; reply_to_message?: { text?: string } };
}

const who = (f: { id: number; first_name?: string; username?: string }) => `tg:${f.username ?? f.first_name ?? f.id}`;

export async function POST(req: NextRequest) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const u = (await req.json()) as Update;

  // Boutons inline
  if (u.callback_query?.data?.startsWith("rv:")) {
    const cq = u.callback_query;
    if (!isAllowed(cq.from.id)) { await answerCallback(cq.id, "Non autorisé"); return NextResponse.json({ ok: true }); }
    const [, action, contentId] = cq.data!.split(":");

    if (action === "g") { // Régénérer → demande de consigne
      await askRegenerationNote(contentId);
      await answerCallback(cq.id, "Dis-moi quoi changer 👇");
      return NextResponse.json({ ok: true });
    }
    const res = await reviewContent({ contentId, decision: action === "a" ? "approve" : "reject", reviewer: who(cq.from) });
    await answerCallback(cq.id, res.ok ? (action === "a" ? "Approuvé ✅" : "Rejeté ❌") : res.reason);
    if (res.ok && res.telegramMessageId) await markDecided(res.telegramMessageId, action === "a" ? `✅ Approuvé par ${who(cq.from)}` : `❌ Rejeté par ${who(cq.from)}`);
    return NextResponse.json({ ok: true });
  }

  // Réponse à la demande de consigne de régénération
  const m = u.message;
  const tag = m?.reply_to_message?.text?.match(/#id:([0-9a-f-]{36})/);
  if (m?.from && tag && isAllowed(m.from.id)) {
    const note = m.text && m.text.trim() !== "-" ? m.text.trim() : undefined;
    await reviewContent({ contentId: tag[1], decision: "regenerate", reviewer: who(m.from), note });
  }
  return NextResponse.json({ ok: true });
}
