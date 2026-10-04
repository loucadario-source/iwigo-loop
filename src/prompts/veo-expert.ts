/**
 * EXPERT EN GÉNÉRATION DE PROMPTS VIDÉO GOOGLE VEO 3.1 & FLOW
 * Spécialisé dans l'écosystème officiel des auto-écoles françaises (ECF / REMC / Permis B).
 * 
 * RÈGLE D'OR : RENDU DU PREMIER JET ABSOLUMENT PREMIUM ("ONE-SHOT EXCELLENCE")
 * Élimination radicale de toutes les causes d'artefacts, de bégaiements ou d'hallucinations textuelles.
 */

export interface VideoExpertContext {
  title?: string;
  agencyCity?: string;
  hookText?: string;
  voiceoverText?: string;
  beatsSummary?: string;
}

/**
 * 1. VERROUILLAGE VOCAL ET ACCENT MÉTROPOLITAIN STRICT
 */
export const FRENCH_VOICEOVER_DIRECTIVES = `VOICEOVER & PHONETICS (ZERO-DEFECT POLICY):
- ACCENT: Native standard mainland French only (Français de France métropolitaine, standard parisien neutre).
- STRICT FORBIDDEN LIST: Absolutely NO Canadian, Québécois, Belgian, Swiss, African, or foreign regional accent.
- SPEAKER: Confident, dynamic, charismatic certified French driving instructor (Titre Pro ECSR), 28-32 years old, natural pedagogic warmth, friendly modern Parisian diction.
- DICTION LOCK: Crisp, modern conversational French. Exactly one punchy, impactful pedagogical tip. Zero repetition, zero stutter, perfect fluid cadence.`;

/**
 * 2. ENVIRONNEMENT AUTO-ÉCOLE FRANÇAIS & DÉTAILS CONFORMES (REMC)
 */
export const FRENCH_DRIVING_SCHOOL_ENVIRONMENT = `AUTHENTIC FRENCH AUTO-ECOLE ENVIRONMENT (CODE DE LA ROUTE & REMC STANDARDS):
- VEHICLE: Genuine modern French dual-control compact car (Peugeot 208 II). Visible secondary instructor pedal-box under passenger dashboard, secondary panoramic surveillance interior mirror clipped above the main rearview mirror, dual-lens exterior wing mirrors.
- COCKPIT: Hands precisely at the 9h15 position on the compact flat-top steering wheel. Clean fabric interior, securely buckled seatbelts.
- ACTORS & WARDROBE:
  * French instructor wearing a clean, solid navy blue polo shirt with ZERO text, ZERO logos, and ZERO distorted AI letters.
  * Young 18-year-old French student driver, focused, smiling, performing an authentic 90-degree head-turn shoulder check (contrôle direct d'angle mort).
- PEDAGOGIC ACTION: Demonstrating one precise, high-value driving rule (e.g., Dutch reach portière check, roundabout priority, or mirror check).`;

/**
 * 3. CAMÉRA CINÉMATOGRAPHIQUE & TECHNIQUE ANTI-HALLUCINATION
 */
export const CINEMATIC_ANTI_HALLUCINATION_RULES = `CINEMATIC CAMERAWORK & ANTI-HALLUCINATION PROTOCOL:
- CAMERA MOVEMENT: Single unbroken continuous tracking shot (smooth slow gimbal push-in from medium shot to crisp medium close-up). NO jump cuts, NO morphing transitions.
- LENS & DEPTH OF FIELD: 50mm portrait prime lens at f/1.8. Shallow depth of field creates a rich, creamy urban background bokeh, naturally eliminating distant signs and preventing any gibberish text hallucinations on buildings.
- LIGHTING: Soft, high-end commercial daylight (golden hour morning sun), realistic windshield reflections, Arri Alexa Mini LF commercial aesthetic, authentic 4K textures.
- AUDIO ATMOSPHERE: Synchronized muffled 3-cylinder engine rumble, crisp mechanical click of the Peugeot turn signal stalk, subtle street ambiance, and pristine studio-grade French voiceover.`;

/**
 * Générateur de prompt VEO 3.1 "One-Shot Premium"
 */
export function boostVeoPrompt(rawPrompt: string, ctx?: VideoExpertContext): string {
  const city = ctx?.agencyCity || "Île-de-France";
  
  // Nettoyage et sécurisation de la réplique vocale pour éviter les bégaiements (max 15-20 mots)
  let cleanVoiceover = ctx?.voiceoverText || "Ce geste simple t'évite l'élimination directe le jour du permis !";
  cleanVoiceover = cleanVoiceover.replace(/["\n\r]/g, " ").trim();
  // Limiter la longueur pour garantir une diction parfaite sans bouclage
  if (cleanVoiceover.length > 120) {
    cleanVoiceover = cleanVoiceover.slice(0, 115) + "...";
  }

  const hook = ctx?.hookText ? `Pedagogical topic: "${ctx.hookText}". ` : "";

  return (
    `Vertical 9:16 high-end cinematic commercial video for official French certified driving school IWIGO ECF in ${city}, France. ` +
    `${hook}` +
    `${FRENCH_DRIVING_SCHOOL_ENVIRONMENT} ` +
    `${CINEMATIC_ANTI_HALLUCINATION_RULES} ` +
    `${FRENCH_VOICEOVER_DIRECTIVES} ` +
    `Exact spoken French line: "${cleanVoiceover}". ` +
    `Style: Premium national television commercial, 4K resolution, photorealistic, broadcast-grade.`
  );
}
