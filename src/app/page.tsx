import { db } from "@/lib/supabase";
import { getActiveBrand } from "@/lib/brand";
import { AGENCIES } from "@/agents/local-context";
import { trigger } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const brand = await getActiveBrand();
  const [{ data: runs }, { count: pending }, { count: approved }] = await Promise.all([
    db().from("agent_runs").select("*").order("started_at", { ascending: false }).limit(20),
    db().from("contents").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    db().from("contents").select("id", { count: "exact", head: true }).eq("status", "approved"),
  ]);
  const swatches = [brand.palette.ecf.primary, brand.palette.ecf.secondary, brand.palette.ecf.light, brand.palette.iwigo.primary, brand.palette.iwigo.accent, brand.palette.neutral.dark];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5"><div className="text-sm text-ink-mid">En attente de validation</div><div className="font-heading text-4xl font-extrabold text-ecf-primary">{pending ?? 0}</div></div>
        <div className="card p-5"><div className="text-sm text-ink-mid">Prêts à publier (validés)</div><div className="font-heading text-4xl font-extrabold text-green-600">{approved ?? 0}</div></div>
        <div className="card flex flex-col gap-2 p-5">
          <form action={trigger}><input type="hidden" name="kind" value="bootstrap" /><button className="btn-ghost w-full">🧭 Relancer Brand Scout + Contexte Local</button></form>
          <form action={trigger}><input type="hidden" name="kind" value="tick" /><button className="btn-primary w-full">🔁 Lancer un cycle de la boucle</button></form>
        </div>
      </div>

      {/* BANNIÈRE CROISSANCE & GAMIFICATION VIRALE */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-ecf-primary p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-0.5 text-xs font-bold text-amber-300 border border-white/20">
            <span>🚀</span>
            <span>MOTEUR DE CROISSANCE LOCALE & GAMIFICATION</span>
          </div>
          <h2 className="text-lg font-bold">Mini-Quiz du Code en Ligne & 16 Lieux Réels Détectés</h2>
          <p className="text-xs text-blue-200 max-w-2xl leading-relaxed">
            Votre mini-quiz mobile public est actif sur <b>/quiz</b> (10 questions certifiées ETG 2026 avec partage de score en Story Instagram). Les 16 points réels (centres d&apos;examen de Vaux-le-Pénil &amp; Villabé, T Zen 1 &amp; 2, Cités Unies) sont désormais injectés dans les prompts d&apos;accroche locale.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href="/quiz"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-900 shadow hover:bg-blue-50 transition-all flex items-center gap-1.5"
          >
            <span>📱</span>
            <span>Tester le Quiz Mobile</span>
          </a>
          <a
            href="/review"
            className="rounded-xl bg-white/15 border border-white/30 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/25 transition-all"
          >
            Voir les Posts
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-heading font-bold">Charte active (v{brand.version} · {brand.generated_by})</h2>
          <div className="flex gap-2">{swatches.map((c) => <div key={c} title={c} className="h-12 w-12 rounded-lg border" style={{ background: c }} />)}</div>
          <p className="mt-3 text-sm">Polices : <b>{brand.fonts.heading}</b> / <b>{brand.fonts.body}</b></p>
          <p className="text-sm text-ink-mid">Sources : {brand.sources.join(", ") || "seed"}</p>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-heading font-bold">Agences (Agent Contexte Local)</h2>
          <ul className="space-y-1 text-sm">
            {AGENCIES.map((a) => <li key={a.slug}><b>{a.city}</b> ({a.postal_code}) — {a.covered_cities.map((c) => c.name).join(", ")}</li>)}
          </ul>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 font-heading font-bold">Journal des agents</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-ink-mid"><tr><th>Agent</th><th>Statut</th><th>Éléments</th><th>Début</th><th>Erreur</th></tr></thead>
          <tbody>
            {(runs ?? []).map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-1 font-mono">{r.agent}</td>
                <td><span className={`badge ${r.status === "ok" ? "bg-green-100 text-green-800" : r.status === "error" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{r.status}</span></td>
                <td>{r.items}</td>
                <td>{new Date(r.started_at).toLocaleString("fr-FR")}</td>
                <td className="max-w-md truncate text-red-700">{r.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
