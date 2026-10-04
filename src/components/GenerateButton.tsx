"use client";

import { useTransition } from "react";
import { generatePostNowAction } from "@/app/actions";

export function GenerateButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          await generatePostNowAction();
        });
      }}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-all ${
        isPending
          ? "bg-slate-300 text-slate-600 cursor-not-allowed animate-pulse"
          : "bg-gradient-to-r from-ecf-primary to-blue-700 text-white hover:from-blue-800 hover:to-ecf-primary active:scale-95"
      }`}
    >
      {isPending ? (
        <>
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
          <span>Génération IA en cours (10-15s)...</span>
        </>
      ) : (
        <>
          <span>⚡</span>
          <span>Générer un post IA maintenant</span>
        </>
      )}
    </button>
  );
}
