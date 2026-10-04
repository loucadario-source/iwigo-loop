import { z } from "zod";
import { db } from "@/lib/supabase";
import { inngest } from "@/inngest/client";

/** Logique UNIQUE de validation (dashboard + Telegram). */
export const ReviewInput = z.object({
  contentId: z.string().uuid(),
  decision: z.enum(["approve", "reject", "regenerate"]),
  reviewer: z.string().min(1),
  note: z.string().max(1000).optional(),
  patch: z.object({ caption: z.string().optional(), hashtags: z.array(z.string()).optional() }).optional(),
});
export type ReviewInput = z.infer<typeof ReviewInput>;

const STATUS = { approve: "approved", reject: "rejected", regenerate: "changes_requested" } as const;

export async function reviewContent(raw: unknown) {
  const i = ReviewInput.parse(raw);
  const { data, error } = await db()
    .from("contents")
    .update({
      ...(i.patch ?? {}),
      status: STATUS[i.decision],
      review_note: i.note ?? null,
      reviewed_by: i.reviewer,
      reviewed_at: new Date().toISOString(),
      approved_by: i.decision === "approve" ? i.reviewer : null,
    })
    .eq("id", i.contentId)
    .eq("status", "pending_review") // idempotence : une seule décision possible
    .select("id,telegram_message_id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false as const, reason: "Contenu introuvable ou déjà traité" };

  await inngest.send({ name: "content/reviewed", data: { contentId: i.contentId, decision: i.decision, note: i.note ?? null } });
  return { ok: true as const, telegramMessageId: data.telegram_message_id as number | null };
}
