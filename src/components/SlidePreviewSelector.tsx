"use client";

import { useState } from "react";

export function SlidePreviewSelector({ contentId, slidesCount }: { contentId: string; slidesCount: number }) {
  const [mode, setMode] = useState<"text" | "photo">("text");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-mid">Style visuel :</span>
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
            mode === "text"
              ? "bg-ecf-primary text-white shadow-sm"
              : "bg-slate-100 text-ink-dark hover:bg-slate-200"
          }`}
        >
          🏛️ Charte Institutionnelle (Sobre / Texte)
        </button>
        <button
          type="button"
          onClick={() => setMode("photo")}
          className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
            mode === "photo"
              ? "bg-ecf-secondary text-white shadow-sm"
              : "bg-slate-100 text-ink-dark hover:bg-slate-200"
          }`}
        >
          ✨ Montage Photo IA (Nano Banana Pro)
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({ length: slidesCount }).map((_, i) => {
          const src = `/api/render/${contentId}/${i}?mode=${mode}`;
          return (
            <a
              key={`${i}-${mode}`}
              href={src}
              download={`iwigo-${contentId.slice(0, 8)}-${mode}-${i + 1}.png`}
              title="Clique pour télécharger en HD"
              className="group relative flex-shrink-0"
            >
              <img
                src={src}
                alt=""
                className="h-72 w-auto rounded-lg border shadow-sm transition group-hover:scale-[1.02] group-hover:shadow-md"
                loading="lazy"
              />
              <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white backdrop-blur-sm">
                HD 4:5
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
