import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/supabase";
import type { ContentRow } from "@/agents/content-creator";
import { toSlides } from "@/agents/visual-renderer";

const GRAPH = "https://graph.facebook.com/v21.0";

export const publishEnabled = () =>
  Boolean(process.env.META_WEBHOOK_URL) ||
  (process.env.META_PUBLISH_ENABLED === "true" && !!process.env.META_PAGE_TOKEN);

export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function g(path: string, params: Record<string, string>, method: "GET" | "POST" = "POST") {
  const qs = new URLSearchParams({ ...params, access_token: process.env.META_PAGE_TOKEN! });
  const r = await fetch(`${GRAPH}/${path}${method === "GET" ? "?" + qs : ""}`, method === "POST" ? { method, body: qs } : {});
  const j = await r.json();
  if (j.error) throw new Error(`Meta ${path}: ${j.error.message}`);
  return j;
}

export const getLeadgen = (id: string) => g(id, { fields: "field_data,created_time,form_id" }, "GET");
export const getProfileName = (psid: string) => g(psid, { fields: "name" }, "GET").then((j) => j.name as string).catch(() => null);

/**
 * Publication (Option A via Webhook Make.com/n8n, ou Option B directe Meta Graph API).
 * Garde-fou : refuse tout contenu non approuvé.
 */
export async function publishContent(contentId: string) {
  const { data: c } = await db().from("contents").select("*").eq("id", contentId).single<ContentRow>();
  if (!c || c.status !== "approved") throw new Error("Refus : contenu non approuvé");

  const base = process.env.APP_URL!;
  const urls = toSlides(c).map((_, i) => `${base}/api/render/${c.id}/${i}`);
  const caption = `${c.caption ?? ""}\n\n${c.hashtags.join(" ")}`;

  // OPTION A : Webhook Make.com / n8n / Zapier
  if (process.env.META_WEBHOOK_URL) {
    const payload = {
      event: "content.publish",
      content_id: c.id,
      title: c.title,
      format: c.format,
      pillar: c.pillar,
      agency_slug: c.agency_slug,
      caption: c.caption,
      hashtags: c.hashtags,
      full_text: caption,
      media_urls: urls,
      body: c.body,
      cta: c.cta,
      sources: c.sources,
      published_at: new Date().toISOString(),
    };

    const res = await fetch(process.env.META_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Webhook publication failed: HTTP ${res.status} ${res.statusText}`);
    }

    const ids = { webhook: "sent_to_make", timestamp: new Date().toISOString() };
    await db().from("contents").update({ status: "published", published_at: new Date().toISOString(), meta_post_ids: ids }).eq("id", c.id);
    return ids;
  }

  // OPTION B : Meta Graph API Directe
  if (c.format === "reel_script") return { skipped: "reel à tourner manuellement ou via VEO" };
  const ig = process.env.META_IG_USER_ID!;
  const ids: Record<string, string> = {};

  if (urls.length === 1) {
    const cont = await g(`${ig}/media`, { image_url: urls[0], caption });
    ids.instagram = (await g(`${ig}/media_publish`, { creation_id: cont.id })).id;
    ids.facebook = (await g(`${process.env.META_PAGE_ID}/photos`, { url: urls[0], caption })).post_id;
  } else {
    const children = [];
    for (const u of urls) children.push((await g(`${ig}/media`, { image_url: u, is_carousel_item: "true" })).id);
    const cont = await g(`${ig}/media`, { media_type: "CAROUSEL", children: children.join(","), caption });
    ids.instagram = (await g(`${ig}/media_publish`, { creation_id: cont.id })).id;
    const photos = [];
    for (const u of urls) photos.push((await g(`${process.env.META_PAGE_ID}/photos`, { url: u, published: "false" })).id);
    const attached: Record<string, string> = { message: caption };
    photos.forEach((p, i) => (attached[`attached_media[${i}]`] = JSON.stringify({ media_fbid: p })));
    ids.facebook = (await g(`${process.env.META_PAGE_ID}/feed`, attached)).id;
  }

  await db().from("contents").update({ status: "published", published_at: new Date().toISOString(), meta_post_ids: ids }).eq("id", c.id).eq("status", "approved");
  return ids;
}
