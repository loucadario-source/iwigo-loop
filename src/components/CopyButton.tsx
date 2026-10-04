"use client";
import { useState } from "react";

export function CopyButton({ text, label = "📋 Copier légende + hashtags" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="btn-ghost" onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}>
      {ok ? "✅ Copié" : label}
    </button>
  );
}
