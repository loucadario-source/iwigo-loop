/**
 * AGENT NANO BANANA / GEMINI IMAGE GENERATOR
 * Utilise le modèle Google Nano Banana Pro (`models/gemini-3-pro-image`) pour générer
 * des visuels ultra-réalistes et personnalisés respectant le contexte auto-école IWIGO ECF.
 */

export async function generateNanoBananaImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `High quality commercial photography, 4k, cinematic, realistic lighting, French suburban context: ${prompt}. Professional shot for modern driving school social media. No ugly, no blurry, no deformed limbs.`,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!res.ok) {
      console.warn("Nano Banana Pro API returned status:", res.status);
      return null;
    }

    const data = await res.json();
    const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    if (!part?.inlineData?.data) return null;

    const mime = part.inlineData.mimeType || "image/jpeg";
    return `data:${mime};base64,${part.inlineData.data}`;
  } catch (err) {
    console.warn("Error calling Nano Banana Pro image model:", err);
    return null;
  }
}
