import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import brand from "@/brand/brand.generated.json";

export const metadata = { title: "IWIGO Loop", description: "Marketing autonome & leads — IWIGO Auto-école ECF" };

export default function RootLayout({ children }: { children: ReactNode }) {
  const gf = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.fonts.heading)}:wght@700;800&family=${encodeURIComponent(brand.fonts.body)}:wght@400;600&display=swap`;
  return (
    <html lang="fr">
      <head><link rel="stylesheet" href={gf} /></head>
      <body>
        <header className="bg-ecf-primary text-white">
          <nav className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
            <span className="font-heading text-lg font-extrabold">IWIGO <span className="text-ecf-secondary">×</span> ECF · Loop</span>
            <Link href="/" className="opacity-90 hover:opacity-100">Agents</Link>
            <Link href="/review" className="opacity-90 hover:opacity-100">Validation</Link>
            <Link href="/trends" className="opacity-90 hover:opacity-100">Veille</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-7xl p-6">{children}</main>
      </body>
    </html>
  );
}
