/* eslint-disable @next/next/no-img-element */
import type { BrandProfile } from "@/lib/brand";

/**
 * GABARITS VISUELS FIXES ECF / IWIGO (rendus par Satori via next/og).
 * Les couleurs / polices / logos viennent exclusivement du profil généré par l'Agent Brand Scout.
 * Le LLM ne fournit que les textes + le type de layout.
 */

export type Layout = "hook" | "tip" | "quiz" | "stat" | "cta";
export interface SlideSpec {
  layout: Layout;
  title: string;
  text?: string;
  index: number;
  total: number;
  agencyCity?: string;
  imagePrompt?: string;
  imageData?: string | null;
}

export const SIZE = { width: 1080, height: 1350 }; // 4:5 Instagram

function Header({ b, index, total }: { b: BrandProfile; index: number; total: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {b.logos.iwigo ? <img src={b.logos.iwigo} height={64} alt="" /> : <div style={{ fontSize: 44, fontWeight: 800, color: b.palette.ecf.primary, fontFamily: "heading" }}>IWIGO</div>}
        <div style={{ width: 3, height: 44, background: b.palette.ecf.secondary }} />
        {b.logos.ecf ? <img src={b.logos.ecf} height={56} alt="" /> : <div style={{ fontSize: 36, fontWeight: 800, color: b.palette.ecf.secondary, fontFamily: "heading" }}>ECF</div>}
      </div>
      {total > 1 && <div style={{ fontSize: 28, color: b.palette.neutral.mid }}>{`${index + 1}/${total}`}</div>}
    </div>
  );
}

function Footer({ b, city }: { b: BrandProfile; city?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", fontSize: 28, color: b.palette.neutral.mid }}>
      <div>{b.tone.signature}</div>
      <div>{city ? `📍 ${city}` : "Seine-et-Marne"}</div>
    </div>
  );
}

export function SlideTemplate({ b, s }: { b: BrandProfile; s: SlideSpec }) {
  const hasImg = !!s.imageData;
  const dark = s.layout === "hook" || s.layout === "cta" || hasImg;
  const bg = dark ? b.palette.ecf.primary : b.palette.neutral.white;
  const fg = dark ? b.palette.neutral.white : b.palette.neutral.dark;

  return (
    <div style={{ ...SIZE, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: bg, fontFamily: "body", position: "relative" }}>
      {/* Image de fond IA (Nano Banana Pro) avec assombrissement doux */}
      {hasImg && (
        <img
          src={s.imageData!}
          style={{ position: "absolute", left: 0, top: 0, width: SIZE.width, height: SIZE.height, objectFit: "cover" }}
          alt=""
        />
      )}
      {hasImg && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: SIZE.width,
            height: SIZE.height,
            background: "linear-gradient(to top, rgba(0, 30, 60, 0.95) 0%, rgba(0, 30, 60, 0.4) 60%, rgba(0, 30, 60, 0.8) 100%)",
          }}
        />
      )}
      {/* bande signature rouge ECF */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 24, height: SIZE.height, background: b.palette.ecf.secondary }} />
      {dark ? (
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", zIndex: 10 }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "white", fontFamily: "heading" }}>IWIGO × ECF</div>
          {s.total > 1 && <div style={{ fontSize: 28, color: b.palette.ecf.light }}>{`${s.index + 1}/${s.total}`}</div>}
        </div>
      ) : (
        <Header b={b} index={s.index} total={s.total} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 40, zIndex: 10 }}>
        {s.layout === "quiz" && <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: b.palette.iwigo.accent, letterSpacing: 4 }}>QUIZ</div>}
        {s.layout === "stat" && <div style={{ display: "flex", width: 140, height: 12, background: b.palette.ecf.secondary }} />}
        <div style={{ display: "flex", fontFamily: "heading", fontWeight: 800, fontSize: s.layout === "hook" ? 96 : 68, lineHeight: 1.1, color: s.layout === "stat" ? b.palette.ecf.primary : fg }}>
          {s.title}
        </div>
        {s.text ? <div style={{ display: "flex", fontSize: 42, lineHeight: 1.4, color: dark ? b.palette.ecf.light : b.palette.neutral.mid }}>{s.text}</div> : null}
        {s.layout === "cta" && (
          <div style={{ display: "flex", alignSelf: "flex-start", padding: "24px 48px", borderRadius: 999, background: b.palette.ecf.secondary, color: "white", fontSize: 40, fontWeight: 800, fontFamily: "heading" }}>
            Écris PERMIS en DM
          </div>
        )}
      </div>

      {dark ? <div style={{ display: "flex", fontSize: 28, color: b.palette.ecf.light, zIndex: 10 }}>{`${b.tone.signature}${s.agencyCity ? " · " + s.agencyCity : ""}`}</div> : <Footer b={b} city={s.agencyCity} />}
    </div>
  );
}

/** Récupère un TTF Google Fonts (Satori n'accepte pas woff2). */
export async function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`, {
      headers: { "user-agent": "Mozilla/5.0 (Unknown; Linux x86_64) AppleWebKit/538.1 (KHTML, like Gecko) PhantomJS/2.1.1 Safari/538.1" },
    })).text();
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}
