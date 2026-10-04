import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Trends() {
  const { data } = await db().from("trends").select("*").order("detected_at", { ascending: false }).limit(100);
  return (
    <div className="card p-5">
      <h1 className="mb-3 font-heading text-lg font-bold">Veille — Agent Trend & News Hunter</h1>
      <table className="w-full text-sm">
        <thead className="text-left text-ink-mid"><tr><th>Score</th><th>Pilier</th><th>Titre / angle</th><th>Statut</th><th>Date</th></tr></thead>
        <tbody>
          {(data ?? []).map((t) => (
            <tr key={t.id} className="border-t align-top">
              <td className="py-2 font-bold">{t.relevance_score}</td>
              <td><span className="badge bg-ecf-light text-ecf-primary">{t.pillar}</span>{t.is_regulatory && <span className="badge ml-1 bg-red-100 text-red-800">régl.</span>}</td>
              <td><a href={t.source_url ?? "#"} target="_blank" className="font-semibold underline">{t.title}</a><p className="text-ink-mid">{t.suggested_angle}</p></td>
              <td>{t.status}</td>
              <td>{new Date(t.detected_at).toLocaleDateString("fr-FR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
