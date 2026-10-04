import { z } from "zod";

/**
 * Moteur LLM multi-fournisseur (REST, sans SDK).
 * LLM_PROVIDER = gemini | anthropic | openai ; LLM_MODEL / LLM_MODEL_FAST.
 */
type Provider = "gemini" | "anthropic" | "openai";

const DEFAULTS: Record<Provider, { main: string; fast: string }> = {
  gemini: { main: "gemini-3.8-flash", fast: "gemini-3.8-flash" },
  anthropic: { main: "claude-sonnet-4-5", fast: "claude-haiku-4-5" },
  openai: { main: "gpt-4o", fast: "gpt-4o-mini" },
};

export interface LlmCall {
  system: string;
  user: string;
  fast?: boolean;
  temperature?: number;
}

function cfg(fast?: boolean) {
  const provider = (process.env.LLM_PROVIDER ?? "gemini") as Provider;
  if (!DEFAULTS[provider]) throw new Error(`LLM_PROVIDER inconnu: ${provider}`);
  const model = fast
    ? process.env.LLM_MODEL_FAST || DEFAULTS[provider].fast
    : process.env.LLM_MODEL || DEFAULTS[provider].main;
  return { provider, model };
}

async function post(url: string, headers: Record<string, string>, body: unknown, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
      if (res.status === 503 || res.status === 429) {
        if (attempt < retries) {
          const delay = (attempt + 1) * 2000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }
      if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 500)}`);
      return res.json();
    } catch (e: any) {
      if (attempt === retries) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

export async function llmText({ system, user, fast, temperature = 0.7 }: LlmCall): Promise<string> {
  const { provider, model } = cfg(fast);
  if (provider === "gemini") {
    const j = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {},
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature, responseMimeType: "application/json" },
      },
    );
    return j.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  }
  if (provider === "anthropic") {
    const j = await post(
      "https://api.anthropic.com/v1/messages",
      { "x-api-key": process.env.ANTHROPIC_API_KEY ?? "", "anthropic-version": "2023-06-01" },
      { model, max_tokens: 4096, temperature, system, messages: [{ role: "user", content: user }] },
    );
    return j.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
  }
  const j = await post(
    "https://api.openai.com/v1/chat/completions",
    { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    { model, temperature, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] },
  );
  return j.choices?.[0]?.message?.content ?? "";
}

function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const text = fenced ? fenced[1] : raw;
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  return JSON.parse(text.slice(start, end + 1));
}

/** Appel JSON validé par Zod, avec 1 tentative de réparation. */
export async function llmJson<T>(schema: z.ZodType<T>, call: LlmCall): Promise<T> {
  let raw = await llmText(call);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return schema.parse(extractJson(raw));
    } catch (e) {
      if (attempt === 1) throw new Error(`Sortie LLM invalide: ${String(e).slice(0, 400)}`);
      raw = await llmText({
        ...call,
        temperature: 0,
        user: `${call.user}\n\nTa réponse précédente était invalide (${String(e).slice(0, 300)}). Réponds UNIQUEMENT avec le JSON corrigé.`,
      });
    }
  }
  throw new Error("unreachable");
}
