/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { db } from "@/lib/supabase";
import { reviewAction, markPublishedManually, publishToSocialsAction } from "@/app/actions";
import { toSlides } from "@/agents/visual-renderer";
import { AGENCIES } from "@/agents/local-context";
import { CopyButton } from "@/components/CopyButton";
import { SlidePreviewSelector } from "@/components/SlidePreviewSelector";
import { GenerateButton } from "@/components/GenerateButton";
import { VideoGenerator } from "@/components/VideoGenerator";
import { boostVeoPrompt } from "@/prompts/veo-expert";
import type { ContentRow } from "@/agents/content-creator";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "pending", label: "À valider", statuses: ["pending_review"] },
  { key: "approved", label: "Prêts à publier (export)", statuses: ["approved"] },
  { key: "history", label: "Historique", statuses: ["published", "rejected", "changes_requested", "failed"] },
] as const;


function Script({ c }: { c: ContentRow }) {
  if (c.format !== "reel_script") return null;
  const b = c.body as {
    duration_s: number;
    hook: { on_screen_text: string; voiceover: string };
    beats: Array<{ t: string; shot: string; on_screen_text: string; voiceover: string }>;
    cta: string;
    audio_suggestion?: string;
    veo_video_prompt?: string;
    video_url?: string;
  };

  const beatsSummary = b.beats.map((bt) => bt.shot).join(", ");
  const agency = AGENCIES.find((a) => a.slug === c.agency_slug);
  const rawPrompt = b.veo_video_prompt;
  const veoPrompt = rawPrompt && rawPrompt.includes("STRICT ACCENT & VOICE REQUIREMENTS")
    ? rawPrompt
    : boostVeoPrompt(rawPrompt || c.title, {
        title: c.title,
        agencyCity: agency?.city,
        hookText: b.hook.on_screen_text,
        voiceoverText: b.hook.voiceover,
        beatsSummary,
      });
    return (
      <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ecf-primary">🎬 Script Reel/TikTok · {b.duration_s}s {b.audio_suggestion && `· 🎵 ${b.audio_suggestion}`}</p>
          <span className="badge bg-purple-100 text-purple-800 font-bold">Compatible Google Flow / VEO 3.1</span>
        </div>
        <p><b>Hook (0-3s)</b> : « {b.hook.on_screen_text} » — 🗣 {b.hook.voiceover}</p>
        <ol className="ml-4 list-decimal space-y-1">{b.beats.map((x, i) => <li key={i}><b>{x.t}</b> [{x.shot}] « {x.on_screen_text} » — {x.voiceover}</li>)}</ol>
        <p><b>CTA</b> : {b.cta}</p>

        <VideoGenerator contentId={c.id} initialVideoUrl={b.video_url} prompt={veoPrompt} />

        <details className="mt-2 text-xs text-purple-900">
          <summary className="cursor-pointer font-medium hover:underline">
            Voir le prompt textuel brut VEO 3.1
          </summary>
          <div className="mt-2 rounded border border-purple-200 bg-purple-50 p-2.5">
            <code className="text-xs text-purple-950 block select-all bg-white p-2 rounded border border-purple-150 font-mono">{veoPrompt}</code>
          </div>
        </details>
      </div>
    );
}

export default async function Review({ searchParams }: { searchParams: { tab?: string; id?: string } }) {
  const tab = TABS.find((t) => t.key === searchParams.tab) ?? TABS[0];
  let q = db().from("contents").select("*").in("status", tab.statuses as unknown as string[]).order("created_at", { ascending: false }).limit(30);
  if (searchParams.id) q = db().from("contents").select("*").eq("id", searchParams.id);
  const { data } = await q;
  const items = (data ?? []) as ContentRow[];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {TABS.map((t) => <Link key={t.key} href={`/review?tab=${t.key}`} className={t.key === tab.key && !searchParams.id ? "btn-primary" : "btn-ghost"}>{t.label}</Link>)}
        </div>
        <GenerateButton />
      </div>
      {!items.length && <p className="text-ink-mid">Rien ici pour l&apos;instant — cliquez sur « Générer un post IA maintenant » pour lancer la création ! 🚀</p>}


      {items.map((c) => {
        const slides = toSlides(c);
        const fullText = `${c.caption ?? ""}\n\n${c.hashtags.join(" ")}`;
        return (
          <article key={c.id} className="card space-y-3 p-5">
            <header className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading text-lg font-bold">{c.title}</h2>
              <span className="badge bg-ecf-light text-ecf-primary">{c.pillar}</span>
              <span className="badge bg-slate-100">{c.format}</span>
              <span className="badge bg-slate-100">📍 {AGENCIES.find((a) => a.slug === c.agency_slug)?.city ?? "réseau"}</span>
              <span className="badge bg-slate-100">v{c.version}</span>
              {c.status === "pending_review" && <span className="badge bg-amber-100 text-amber-800 font-bold">⏳ À valider</span>}
              {c.status === "approved" && <span className="badge bg-green-100 text-green-800 font-bold">✅ Approuvé</span>}
              {c.status === "rejected" && <span className="badge bg-rose-100 text-rose-800 font-bold">❌ Rejeté</span>}
              {c.status === "published" && <span className="badge bg-blue-100 text-blue-800 font-bold">🚀 Publié</span>}
              {c.status === "changes_requested" && <span className="badge bg-orange-100 text-orange-800 font-bold">🔄 En régénération</span>}
              {c.brand_check && <span className={`badge ${c.brand_check.score >= 7 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>Charte {c.brand_check.score}/10</span>}
              {c.needs_fact_check && <span className="badge bg-red-100 text-red-800">⚠️ À vérifier</span>}
            </header>

            <SlidePreviewSelector contentId={c.id} slidesCount={slides.length} />
            <Script c={c} />
            {c.sources.length > 0 && (
              <p className="text-xs text-ink-mid">
                Sources :{" "}
                {c.sources.map((s, idx) => {
                  let host = s;
                  try {
                    host = new URL(s).hostname;
                  } catch {
                    host = s;
                  }
                  return (
                    <a key={idx} href={s} target="_blank" rel="noopener noreferrer" className="mr-2 underline">
                      {host}
                    </a>
                  );
                })}
              </p>
            )}
            {c.review_note && <p className="text-sm italic text-ink-mid">Note : {c.review_note}</p>}

            {c.status === "pending_review" ? (
              <form action={reviewAction} className="space-y-2">
                <input type="hidden" name="id" value={c.id} />
                <textarea name="caption" defaultValue={c.caption ?? ""} rows={6} className="w-full rounded-lg border p-2 text-sm" />
                <p className="text-sm text-ink-mid">{c.hashtags.join(" ")}</p>
                <input name="note" placeholder="Consigne (pour Régénérer) ou motif (pour Rejeter)" className="w-full rounded-lg border p-2 text-sm" />
                <div className="flex gap-2">
                  <button name="decision" value="approve" className="btn-primary">✅ Approuver</button>
                  <button name="decision" value="regenerate" className="btn-ghost">🔄 Régénérer</button>
                  <button name="decision" value="reject" className="btn-danger">❌ Rejeter</button>
                </div>
              </form>
            ) : (
              <div className="space-y-2">
                <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{fullText}</pre>
                {c.status === "rejected" && (
                  <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center justify-between">
                    <span>❌ <b>Contenu rejeté</b> — Ce post a été écarté et ne sera pas publié sur vos réseaux sociaux.</span>
                  </div>
                )}
                {c.status === "approved" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <CopyButton text={fullText} />
                    <form action={publishToSocialsAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-pink-700 hover:to-purple-700">
                        🚀 Publier sur Facebook & Instagram (Option A)
                      </button>
                    </form>
                    <form action={markPublishedManually}>
                      <input type="hidden" name="id" value={c.id} />
                      <button className="btn-ghost text-xs">Marquer comme publié manuellement</button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
