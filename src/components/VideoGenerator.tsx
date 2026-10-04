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
    try {
      setIsGenerating(true);
      setError(null);
      setSecondsElapsed(0);
      setStatusMessage("Étape 1/2 : Envoi du prompt cinématographique à Google VEO 3.1...");

      // Démarrage du chronomètre
      timerIntervalRef.current = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);

      // 1. Déclenchement de la génération
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, prompt }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Impossible d'initialiser la génération VEO 3.1");
      }

      const operationName = data.operationName;
      setStatusMessage("Étape 2/2 : Rendu cinématographique 9:16 en cours (~60s)...");

      // 2. Sondage régulier
      pollIntervalRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/video/status?op=${encodeURIComponent(operationName)}&contentId=${encodeURIComponent(contentId)}`
          );
          const statusData = await statusRes.json();

          if (!statusRes.ok || statusData.error) {
            throw new Error(statusData.error || "Erreur de traitement vidéo");
          }

          if (statusData.done && statusData.videoUrl) {
            // Terminé !
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
            setVideoUrl(statusData.videoUrl);
            setIsGenerating(false);
            setStatusMessage("");
            fetchQuota();
          }
        } catch (pollErr: unknown) {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setIsGenerating(false);
          const msg = pollErr instanceof Error ? pollErr.message : String(pollErr);
          setError(msg);
        }
      }, 6000);
    } catch (err: unknown) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="font-semibold text-purple-950 text-sm flex items-center gap-1.5">
            <span>🎥</span> Vidéo VEO 3.1 (Google DeepMind)
            {quota && (
              <span
                className={`ml-2 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  quota.canGenerate
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                {quota.canGenerate
                  ? `⚡ Quota : ${quota.remaining}/${quota.maxPerWeek} vidéo dispo cette semaine`
                  : `🔒 Quota hebdo atteint (1/1 cette semaine)`}
              </span>
            )}
          </h4>
          <p className="text-xs text-purple-800">
            Format vertical 9:16 natif · Spécialité Permis B & ECF · Rendu One-Shot Ultra-Premium
          </p>
        </div>

        {!videoUrl && !isGenerating && (
          <div>
            {quota && !quota.canGenerate ? (
              <div className="text-right">
                <button
                  disabled
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 cursor-not-allowed border border-slate-300"
                >
                  🔒 Quota atteint (1/semaine)
                </button>
                <p className="text-[10px] text-slate-500 mt-0.5">Dispo dès lundi 00h</p>
              </div>
            ) : (
              <button
                onClick={handleStartGeneration}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 active:scale-95 transition-all"
              >
                <span>🎬</span> Générer la vidéo (1-Clic)
              </button>
            )}
          </div>
        )}
      </div>

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

      {/* Message d'erreur */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 space-y-2">
          <p>⚠️ <b>Erreur :</b> {error}</p>
          <button
            onClick={handleStartGeneration}
            className="text-xs font-bold text-red-900 underline hover:no-underline"
          >
            Réessayer la génération
          </button>
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
