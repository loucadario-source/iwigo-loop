import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Client serveur (service_role). Ne jamais importer côté navigateur. */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase non configuré (.env)");
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export async function logRun<T>(agent: string, fn: () => Promise<{ items: number; detail?: unknown; result: T }>): Promise<T> {
  const { data: run } = await db().from("agent_runs").insert({ agent, status: "running" }).select("id").single();
  try {
    const out = await fn();
    await db().from("agent_runs").update({ status: "ok", items: out.items, detail: out.detail ?? null, finished_at: new Date().toISOString() }).eq("id", run?.id);
    return out.result;
  } catch (e) {
    await db().from("agent_runs").update({ status: "error", error: String(e), finished_at: new Date().toISOString() }).eq("id", run?.id);
    throw e;
  }
}
