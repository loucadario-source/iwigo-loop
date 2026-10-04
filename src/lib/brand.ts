import { z } from "zod";
import seed from "@/brand/brand.generated.json";
import { db } from "@/lib/supabase";

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const BrandProfile = z.object({
  version: z.number(),
  generated_by: z.string(),
  generated_at: z.string().nullable(),
  palette: z.object({
    ecf: z.object({ primary: hex, secondary: hex, light: hex }),
    iwigo: z.object({ primary: hex, accent: hex }),
    neutral: z.object({ dark: hex, mid: hex, light: hex, white: hex }),
  }),
  fonts: z.object({ heading: z.string(), body: z.string() }),
  logos: z.object({ ecf: z.string().nullable(), iwigo: z.string().nullable() }),
  tone: z.object({ keywords: z.array(z.string()), signature: z.string() }),
  sources: z.array(z.string()),
});
export type BrandProfile = z.infer<typeof BrandProfile>;

export const SEED_BRAND: BrandProfile = BrandProfile.parse(seed);

/** Charte active : BDD (générée par l'agent) sinon seed. */
export async function getActiveBrand(): Promise<BrandProfile> {
  try {
    const { data } = await db().from("brand_profiles").select("profile").eq("is_active", true).maybeSingle();
    if (data?.profile) return BrandProfile.parse(data.profile);
  } catch {
    /* BDD indisponible → seed */
  }
  return SEED_BRAND;
}
