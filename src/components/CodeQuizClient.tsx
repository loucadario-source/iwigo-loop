"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import quizData from "@/data/quiz-questions.json";

interface Question {
  id: string;
  difficulty: string;
  theme: string;
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string;
  source_url: string;
}

const AGENCIES = [
  {
    city: "Melun",
    phone: "01 64 39 12 34",
    address: "Gare & Centre-Ville",
    facebookUrl: "https://www.facebook.com/p/Iwigo-Permis-Melun-100063569949985/?locale=fr_FR",
  },
  {
    city: "Savigny-le-Temple",
    phone: "01 64 41 56 78",
    address: "Place Paul Desphelipon",
    facebookUrl: "https://www.facebook.com/p/Iwigo-Permis-Savigny-100053445225017/?locale=fr_FR",
  },
  {
    city: "Le Châtelet-en-Brie",
    phone: "01 64 25 90 12",
    address: "Centre-Bourg",
    facebookUrl: "https://www.facebook.com/p/Iwigo-Permis-Le-Chatelet-100049723672955/",
  },
  {
    city: "Saint-Pierre-du-Perray",
    phone: "01 60 75 34 56",
    address: "Secteur Carré Sénart",
    facebookUrl: "https://www.facebook.com/p/Iwigo-Permis-Melun-100063569949985/?locale=fr_FR",
  },
];

export function CodeQuizClient() {
  const [mounted, setMounted] = useState(false);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    // Sélection aléatoire de 10 questions côté client uniquement (évite le conflit d'hydratation SSR)
    const easy = quizData.filter((q) => q.difficulty === "easy");
    const medium = quizData.filter((q) => q.difficulty === "medium");
    const hard = quizData.filter((q) => q.difficulty === "hard");

    const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => 0.5 - Math.random());

    const selected: Question[] = [
      ...shuffle(easy).slice(0, 4),
      ...shuffle(medium).slice(0, 4),
      ...shuffle(hard).slice(0, 2),
    ];
    setSessionQuestions(shuffle(selected));
    setMounted(true);
  }, []);

  const currentQ = sessionQuestions[currentIndex];

  const handleSelectChoice = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);
    if (index === currentQ.answer_index) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < sessionQuestions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const handleShare = () => {
    const text = `🏆 J'ai fait ${score}/10 au Défi Code de la Route IWIGO ECF ! Fais le test pour voir ton score et abonne-toi à @iwigopermis_melun pour les astuces permis : ${window.location.href}`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 3000);
  };

  const getScoreVerdict = () => {
    if (score >= 9) return { title: "Niveau Pilote Émérite ! 🏆", desc: "Impressionnant ! Tu maîtrises les règles et les pièges sur le bout des doigts." };
    if (score >= 7) return { title: "Très bon score ! 🚗", desc: "Félicitations ! Tu es prêt pour l'examen officiel, encore 1 ou 2 pièges à sécuriser." };
    if (score >= 5) return { title: "Pas mal, mais attention aux pièges ! ⚠️", desc: "Les notions de base sont là, mais les questions éliminatoires demandent une révision." };
    return { title: "Besoin d'un petit échauffement ! 📚", desc: "Pas d'inquiétude : un petit stage ou quelques séries en agence et tu seras au top !" };
  };

  if (!mounted || sessionQuestions.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-slate-500">Chargement de votre série express...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* En-tête de marque */}
      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-900 border border-blue-200">
          <span>🚦</span>
          <span>DÉFI OFFICIEL CODE DE LA ROUTE</span>
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
          IWIGO <span className="text-red-600">×</span> ECF Quiz
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          10 questions express conformes à l&apos;Épreuve Théorique Générale (ETG 2026)
        </p>
      </div>

      {!isFinished ? (
        <div className="space-y-4">
          {/* Barre de progression & Compteur */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Question {currentIndex + 1} / {sessionQuestions.length}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 font-mono">
                Score : {score} pts
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Carte de Question */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                {currentQ.theme}
              </span>
              <span
                className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                  currentQ.difficulty === "easy"
                    ? "bg-green-50 text-green-700"
                    : currentQ.difficulty === "medium"
                    ? "bg-amber-50 text-amber-800"
                    : "bg-red-50 text-red-700 font-bold"
                }`}
              >
                {currentQ.difficulty === "easy" ? "🟢 Facile" : currentQ.difficulty === "medium" ? "🟠 Intermédiaire" : "🔴 Piège Examen"}
              </span>
            </div>

            <h2 className="text-base font-bold text-slate-900 leading-snug">
              {currentQ.question}
            </h2>

            {/* Choix A, B, C */}
            <div className="space-y-2.5 pt-2">
              {currentQ.choices.map((choice, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === currentQ.answer_index;
                let btnStyle = "border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-800";

                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = "border-green-500 bg-green-50 text-green-950 font-bold ring-2 ring-green-500/20";
                  } else if (isSelected) {
                    btnStyle = "border-red-500 bg-red-50 text-red-950 font-semibold ring-2 ring-red-500/20";
                  } else {
                    btnStyle = "border-slate-200 bg-slate-50 opacity-50 text-slate-500";
                  }
                }

                const letter = idx === 0 ? "A" : idx === 1 ? "B" : "C";

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectChoice(idx)}
                    disabled={isAnswered}
                    className={`w-full text-left flex items-start gap-3 rounded-xl border p-3.5 text-sm transition-all ${btnStyle}`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white border border-slate-300 font-bold text-xs shadow-2xs">
                      {letter}
                    </span>
                    <span className="pt-0.5 leading-snug flex-1">{choice}</span>
                    {isAnswered && isCorrect && <span className="text-green-600 font-bold">✓</span>}
                    {isAnswered && isSelected && !isCorrect && <span className="text-red-600 font-bold">✕</span>}
                  </button>
                );
              })}
            </div>

            {/* Explication & Règle juridique */}
            {isAnswered && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-1.5 animate-fade-in text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <span>💡</span>
                  <span>Règle officielle du Code :</span>
                </div>
                <p className="text-blue-950 leading-relaxed">{currentQ.explanation}</p>
                <div className="pt-1">
                  <a
                    href={currentQ.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-700 underline hover:no-underline font-medium"
                  >
                    Vérifier sur Légifrance / Sécurité Routière ↗
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Bouton Suivant */}
          {isAnswered && (
            <button
              onClick={handleNext}
              className="w-full rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 py-3.5 text-sm font-bold text-white shadow-md hover:from-blue-800 hover:to-indigo-800 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>{currentIndex + 1 === sessionQuestions.length ? "Voir mes résultats finaux" : "Question suivante"}</span>
              <span>→</span>
            </button>
          )}
        </div>
      ) : (
        /* ÉCRAN DE FIN DE QUIZ & SCORE VIRAL */
        <div className="space-y-5 animate-fade-in">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm space-y-3">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 text-3xl shadow-inner border border-amber-300">
              {score >= 8 ? "🏆" : score >= 5 ? "🚗" : "📚"}
            </div>

            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500">Ton résultat</span>
              <div className="text-4xl font-extrabold text-blue-900">
                {score} <span className="text-xl text-slate-400 font-semibold">/ 10</span>
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <h3 className="text-lg font-bold text-slate-900">{getScoreVerdict().title}</h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">{getScoreVerdict().desc}</p>
            </div>

            {/* Boutons de partage viral */}
            <div className="pt-3 space-y-2">
              <button
                onClick={handleShare}
                className="w-full rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
              >
                <span>📲</span>
                <span>{copiedShare ? "✅ Texte copié avec @iwigopermis_melun !" : "Partager mon score en Story Instagram"}</span>
              </button>

              <button
                onClick={handleRestart}
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                🔄 Recommencer avec 10 nouvelles questions
              </button>
            </div>
          </div>

          {/* BLOC ABONNEMENT RÉSEAUX SOCIAUX (INSTAGRAM & FACEBOOK) */}
          <div className="rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-5 shadow-sm space-y-3.5">
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-100 px-3 py-0.5 text-xs font-bold text-pink-900 border border-pink-200">
                <span>📸</span>
                <span>COMMUNAUTÉ IWIGO ECF</span>
              </div>
              <h4 className="text-base font-bold text-slate-900">Révise ton Code &amp; Permis chaque semaine</h4>
              <p className="text-xs text-slate-600">
                Chaque lundi : un piège d&apos;examen décrypté en vidéo Reel, des quiz en Story et les dates de passage au permis !
              </p>
            </div>

            {/* Bouton Instagram Star */}
            <a
              href="https://www.instagram.com/iwigopermis_melun/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 p-3.5 text-xs font-bold text-white shadow-md hover:opacity-95 transition-all flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📸</span>
                <div className="text-left">
                  <div className="font-extrabold text-sm">S&apos;abonner sur Instagram</div>
                  <div className="text-[11px] text-pink-100 font-normal">@iwigopermis_melun · Astuces, Reels &amp; Stories</div>
                </div>
              </div>
              <span className="rounded-lg bg-white/20 px-2.5 py-1 text-xs font-bold">Suivre ↗</span>
            </a>

            {/* Pages Facebook Officielles */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center">
                Suis aussi la page Facebook de ton agence :
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <a
                  href="https://www.facebook.com/p/Iwigo-Permis-Melun-100063569949985/?locale=fr_FR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white p-2 border border-blue-200 text-center hover:bg-blue-50 transition-all text-xs font-semibold text-blue-900 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>📘</span>
                  <span>Melun</span>
                </a>
                <a
                  href="https://www.facebook.com/p/Iwigo-Permis-Savigny-100053445225017/?locale=fr_FR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white p-2 border border-blue-200 text-center hover:bg-blue-50 transition-all text-xs font-semibold text-blue-900 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>📘</span>
                  <span>Savigny</span>
                </a>
                <a
                  href="https://www.facebook.com/p/Iwigo-Permis-Le-Chatelet-100049723672955/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-white p-2 border border-blue-200 text-center hover:bg-blue-50 transition-all text-xs font-semibold text-blue-900 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span>📘</span>
                  <span>Le Châtelet</span>
                </a>
              </div>
            </div>
          </div>

          {/* CARTE AGENCES & CONVERSION ELEVE */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 space-y-3">
            <div className="text-center space-y-1">
              <span className="badge bg-blue-100 text-blue-900 font-bold text-[10px]">RÉSEAU OFFICIEL ECF</span>
              <h4 className="text-sm font-bold text-blue-950">Prêt à passer ton permis avec IWIGO ?</h4>
              <p className="text-xs text-blue-800">Nos 4 agences de proximité t&apos;accompagnent avec des moniteurs bienveillants et des cours de code illimités.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
              {AGENCIES.map((ag) => (
                <div key={ag.city} className="rounded-lg bg-white p-2.5 border border-blue-100 space-y-1">
                  <div className="font-bold text-slate-900">📍 {ag.city}</div>
                  <div className="text-[11px] text-slate-500 truncate">{ag.address}</div>
                  <div className="text-[11px] font-semibold text-blue-700">{ag.phone}</div>
                  <a
                    href={ag.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-800 hover:underline flex items-center gap-1 pt-0.5"
                  >
                    <span>📘</span> Page Facebook ↗
                  </a>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="text-[11px] text-slate-500 hover:text-slate-800 underline"
              >
                Accès espace formateurs & administration
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
