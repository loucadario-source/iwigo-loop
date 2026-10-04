/**
 * EXPERT EN GÉNÉRATION DE PROMPTS VIDÉO GOOGLE VEO 3.1 & FLOW
 * Spécialisé dans l'écosystème officiel des auto-écoles françaises (ECF / REMC / Permis B).
 */

export interface VideoExpertContext {
  title?: string;
  agencyCity?: string;
  hookText?: string;
  voiceoverText?: string;
  beatsSummary?: string;
}

/**
 * Directives absolues pour l'accent et la voix :
 * Strictement accent français de France métropolitaine (Île-de-France / Parisien standard).
 * Interdiction stricte d'accent québécois, belge, suisse ou étranger.
 */
export const FRENCH_VOICEOVER_DIRECTIVES = `STRICT ACCENT & VOICE REQUIREMENTS:
- Native standard mainland French accent only (French from France / Île-de-France Parisian standard).
- STRICT BAN: Absolutely no Canadian, Québécois, Belgian, Swiss, or foreign regional accents.
- Voice tone: Warm, charismatic, clear, articulate, dynamic and reassuring French certified driving instructor (enseignant de la conduite ECSR), male or female aged 28-35.
- Pronunciation: Perfect modern metropolitan French diction with natural contemporary phrasing, confident and pedagogic.`;

/**
 * Détails authentiques obligatoires de l'univers auto-école français :
 */
export const FRENCH_DRIVING_SCHOOL_ENVIRONMENT = `AUTHENTIC FRENCH DRIVING SCHOOL DETAILS (ECF & PERMIS B STANDARDS):
1. THE VEHICLE (Double-commande conforme Code de la Route R.317-1):
   - Dual-control modern compact hatchback (Peugeot 208 II or Renault Clio V).
   - Co-driver/Instructor side: Secondary dual pedals clearly visible in the passenger footwell (pédalier double commande d'origine).
   - Additional dual rearview mirrors: Secondary panoramic interior rearview mirror clipped for instructor eye-contact ("rétroviseur intérieur additionnel de surveillance"), plus exterior double-convex blind spot mirrors on side mirrors ("rétroviseurs extérieurs à double lentille").
   - Clean professional cockpit: Hands at 9h15 position on the steering wheel, instructor holding a sleek digital learning tablet on lap.
   - Solid clean polo shirt for instructor (navy blue or crisp white, no warped text or messy AI logos).

2. PEDAGOGIC ACTIONS & ROAD SAFETY (REMC - Référentiel Éducation Mobilité Citoyenne):
   - Realistic learning driver body language: Focused gaze, head turning at 90 degrees for direct blind-spot shoulder check ("contrôle direct angle mort par-dessus l'épaule") before any maneuver.
   - Dutch reach ("réflexe hollandais"): Opening driver door with opposite right hand to naturally check cyclists in the rear.
   - Left stalk turn signal click with audible synchronized indicator clicks.

3. AUTHENTIC FRENCH ROAD INFRASTRUCTURE:
   - French CEREMA street design: Clean white road markings ("bandes blanches réglementaires", zébras, passages piétons), French curb layout, speed bumps ("dos d'âne").
   - Official French road signs (panneaux de danger triangulaires, priorité à droite, giratoire).
   - Surrounding authentic French suburban ambiance (pavillons franciliens, Seine-et-Marne / Île-de-France setting).

4. CINEMATIC ANTI-HALLUCINATION CAMERA WORK:
   - Shallow depth of field (f/1.8 to f/2.2 anamorphic lens, soft creamy urban bokeh): distant background buildings and walls are naturally soft-focused to prevent messy AI text hallucinations.
   - Clean professional lighting: Warm golden daylight, crisp natural car interior reflection, premium commercial TV-spot aesthetics.`;

/**
 * Génère ou booste un prompt vidéo VEO 3.1 ultra-réaliste et conforme.
 */
export function boostVeoPrompt(rawPrompt: string, ctx?: VideoExpertContext): string {
  const city = ctx?.agencyCity || "Île-de-France";
  const hook = ctx?.hookText ? `Opening action & hook: "${ctx.hookText}". ` : "";
  const voice = ctx?.voiceoverText ? `Voiceover spoken dialogue in perfect French: "${ctx.voiceoverText}". ` : "";
  const beats = ctx?.beatsSummary ? `Sequence: ${ctx.beatsSummary}. ` : "";

  return (
    `Cinematic vertical 9:16 high-end commercial video for official French certified driving school ECF IWIGO (${city}, France). ` +
    `${hook}${beats}` +
    `${FRENCH_DRIVING_SCHOOL_ENVIRONMENT} ` +
    `${FRENCH_VOICEOVER_DIRECTIVES} ` +
    `${voice}` +
    `Sound design: Immersive native car interior acoustics, gentle engine hum, synchronized crisp indicator click-clack, and crystal-clear studio-grade French voiceover.`
  );
}
