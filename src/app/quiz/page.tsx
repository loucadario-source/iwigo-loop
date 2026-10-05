import { CodeQuizClient } from "@/components/CodeQuizClient";

export const metadata = {
  title: "Quiz du Code de la Route · IWIGO ECF",
  description: "Teste tes connaissances du Code de la Route en 10 questions express. Défi officiel IWIGO Auto-école ECF.",
};

export default function QuizPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-4">
      <CodeQuizClient />
    </div>
  );
}
