"use client";

import { useState, useEffect, useRef } from "react";

interface VideoGeneratorProps {
  contentId: string;
  initialVideoUrl?: string;
  prompt: string;
}

interface QuotaInfo {
  countThisWeek: number;
  maxPerWeek: number;
  remaining: number;
  canGenerate: boolean;
  resetsAt: string;
}

export function VideoGenerator({ contentId, initialVideoUrl, prompt }: VideoGeneratorProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Charger le statut du quota hebdomadaire
  const fetchQuota = async () => {
    try {
      const res = await fetch("/api/video/quota");
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch {
      // Ignorer
    }
  };

  useEffect(() => {
    fetchQuota();
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleStartGeneration = async () => {
    setError("La génération vidéo automatisée via l'API Veo a été désactivée définitivement pour préserver le budget. Vous pouvez copier le script ou tourner la vidéo au smartphone avec vos moniteurs.");
  };

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
            <span>🎬</span> Script Vidéo Vertical 9:16 (Tournage Réel / Reels & TikTok)
            <span className="ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200">
              🛡️ API Veo Désactivée (0 € de frais)
            </span>
          </h4>
          <p className="text-xs text-slate-600">
            Structure conçue pour tournage smartphone en auto-école ou conversion en carrousel photo Imagen 3.
          </p>
        </div>

        <div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(prompt);
              setStatusMessage("Prompt vidéo copié dans le presse-papier !");
              setTimeout(() => setStatusMessage(""), 3000);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-slate-900 transition-all"
          >
            <span>📋</span> Copier le prompt du script
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-2 rounded bg-green-50 border border-green-200 text-xs text-green-800 font-semibold mb-2">
          ✅ {statusMessage}
        </div>
      )}

      {/* État de chargement en direct */}
      {isGenerating && (
        <div className="rounded-lg border border-purple-200 bg-white p-4 space-y-2 text-center animate-fade-in">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
          <p className="text-sm font-semibold text-purple-900">{statusMessage}</p>
          <p className="text-xs text-slate-500 font-mono">
            Temps écoulé : {secondsElapsed}s (la génération prend environ 45 à 75 secondes)
          </p>
        </div>
      )}

      {/* Message d'erreur / Démo */}
      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3.5 text-xs text-amber-950 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-base">💳</span>
            <div className="flex-1 space-y-1">
              <p className="font-bold text-amber-900">
                Mode Démo · Crédit prépayé Google Cloud / VEO à réapprovisionner
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Le pipeline de production vidéo (prompting cinéma VEO 3.1, contrôle des accents parisiens et cadrage 9:16) est 100% prêt. 
                Google applique un palier de prépaiement sur l&apos;API vidéo.
              </p>
            </div>
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-3 border-t border-amber-200/60 text-[11px]">
            <a
              href="https://aistudio.google.com/app/spend"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-amber-900 underline hover:text-amber-700"
            >
              ↗ Gérer la facturation Google AI Studio
            </a>
            <span className="text-amber-400">•</span>
            <button
              onClick={handleStartGeneration}
              className="font-bold text-indigo-700 hover:text-indigo-900 underline"
            >
              🔄 Relancer dès réactivation du solde
            </button>
          </div>
        </div>
      )}

      {/* Lecteur Vidéo si disponible */}
      {videoUrl && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start bg-white p-3 rounded-lg border border-purple-100">
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-w-[220px] rounded-lg shadow-md aspect-[9/16] object-cover bg-black"
            />
            <div className="flex-1 space-y-2 text-xs text-slate-700">
              <div className="rounded bg-green-50 border border-green-200 p-2 text-green-900 font-medium">
                ✅ Vidéo Reel 9:16 générée et stockée en haute définition !
              </div>
              <p><b>Hébergement :</b> Cloud Supabase Storage public</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-xs inline-flex items-center gap-1"
                >
                  ↗️ Plein écran / Ouvrir
                </a>
                <a
                  href={videoUrl}
                  download={`iwigo_${contentId}.mp4`}
                  className="btn-primary text-xs inline-flex items-center gap-1"
                >
                  ⬇️ Télécharger MP4
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
