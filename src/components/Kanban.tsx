"use client";
import { useState, useTransition } from "react";
import { moveLead } from "@/app/actions";

type Stage = "nouveau" | "contacte" | "inscrit" | "perdu";
export interface LeadCard {
  id: string; full_name: string | null; phone: string | null; email: string | null; city: string | null;
  agency_city: string | null; category: string; intent_summary: string | null; source: string; stage: Stage; created_at: string;
}

const COLS: Array<{ key: Stage; label: string; color: string }> = [
  { key: "nouveau", label: "🆕 Nouveau", color: "border-t-ecf-secondary" },
  { key: "contacte", label: "📞 Contacté", color: "border-t-amber-400" },
  { key: "inscrit", label: "🎓 Inscrit", color: "border-t-green-500" },
  { key: "perdu", label: "Perdu", color: "border-t-slate-300" },
];

export function Kanban({ leads }: { leads: LeadCard[] }) {
  const [, start] = useTransition();
  const [items, setItems] = useState(leads);
  const move = (id: string, stage: Stage) => {
    if (!id) return;
    setItems((s) => s.map((l) => (l.id === id ? { ...l, stage } : l)));
    start(() => moveLead(id, stage));
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {COLS.map((col) => (
        <div key={col.key} className={`card border-t-4 ${col.color} min-h-[60vh] p-3`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => move(e.dataTransfer.getData("id"), col.key)}>
          <h3 className="mb-2 font-heading font-bold">{col.label} <span className="text-ink-mid">({items.filter((l) => l.stage === col.key).length})</span></h3>
          <div className="space-y-2">
            {items.filter((l) => l.stage === col.key).map((l) => (
              <div key={l.id} draggable onDragStart={(e) => e.dataTransfer.setData("id", l.id)} className="cursor-grab rounded-lg border bg-white p-3 text-sm shadow-sm">
                <div className="flex justify-between"><b>{l.full_name ?? "Anonyme"}</b><span className="badge bg-ecf-light text-ecf-primary">{l.category}</span></div>
                <p className="text-ink-mid">{l.intent_summary}</p>
                <p className="mt-1 text-xs">{l.phone && <a href={`tel:${l.phone}`} className="mr-2 underline">{l.phone}</a>}{l.email && <a href={`mailto:${l.email}`} className="underline">{l.email}</a>}</p>
                <p className="mt-1 text-xs text-ink-mid">📍 {l.agency_city ?? l.city ?? "agence ?"} · {l.source} · {new Date(l.created_at).toLocaleDateString("fr-FR")}</p>
                <select className="mt-2 w-full rounded border text-xs md:hidden" value={l.stage} onChange={(e) => move(l.id, e.target.value as Stage)}>
                  {COLS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
