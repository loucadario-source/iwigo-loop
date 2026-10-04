import Link from "next/link";
import { db } from "@/lib/supabase";
import { AGENCIES } from "@/agents/local-context";
import { Kanban, type LeadCard } from "@/components/Kanban";

export const dynamic = "force-dynamic";

const CATS = ["permis_b", "boite_auto", "conduite_accompagnee", "cpf", "recuperation_points", "autre"];

export default async function Leads({ searchParams }: { searchParams: { agency?: string; cat?: string } }) {
  let q = db().from("leads").select("*").order("last_interaction_at", { ascending: false }).limit(300);
  if (searchParams.agency) q = q.eq("agency_slug", searchParams.agency);
  if (searchParams.cat) q = q.eq("category", searchParams.cat);
  const { data } = await q;
  const leads: LeadCard[] = (data ?? []).map((l) => ({ ...l, agency_city: AGENCIES.find((a) => a.slug === l.agency_slug)?.city ?? null }));
  const href = (p: Record<string, string | undefined>) => "/leads?" + new URLSearchParams(Object.entries({ ...searchParams, ...p }).filter(([, v]) => v) as [string, string][]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={href({ agency: undefined })} className={!searchParams.agency ? "btn-primary" : "btn-ghost"}>Toutes agences</Link>
        {AGENCIES.map((a) => <Link key={a.slug} href={href({ agency: a.slug })} className={searchParams.agency === a.slug ? "btn-primary" : "btn-ghost"}>{a.city}</Link>)}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href={href({ cat: undefined })} className={!searchParams.cat ? "btn-primary" : "btn-ghost"}>Toutes formations</Link>
        {CATS.map((c) => <Link key={c} href={href({ cat: c })} className={searchParams.cat === c ? "btn-primary" : "btn-ghost"}>{c}</Link>)}
      </div>
      <Kanban leads={leads} />
    </div>
  );
}
