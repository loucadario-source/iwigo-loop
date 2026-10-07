/**
 * AGENT IMAGE GENERATOR - GOOGLE IMAGEN 3
 * Modèle officiel économique : `imagen-3.0-generate-002`
 * Utilisé pour générer des visuels fixes 1:1 pour carrousels et publications statiques.
 * Remplacement économique et sécurisé interdisant tout modèle vidéo.
 */

export async function generateNanoBananaImage(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instances: [
            {
              prompt: `High quality commercial photography, 4k, clean composition, natural lighting, French driving school context: ${prompt}. Professional social media visual for ECF / IWIGO auto-école. Realistic, sharp focus, no distorted faces or impossible geometry.`,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            outputMimeType: "image/jpeg",
          },
        }),
      }
    );

    if (!res.ok) {
      console.warn("Imagen 3 API returned status:", res.status);
      return null;
    }

    const data = await res.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) return null;

    const mime = data.predictions?.[0]?.mimeType || "image/jpeg";
    return `data:${mime};base64,${b64}`;
  } catch (err) {
    console.warn("Error calling Imagen 3 model:", err);
    return null;
  }
}
