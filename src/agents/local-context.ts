import { db, logRun } from "@/lib/supabase";

/** AGENT CONTEXTE LOCAL — périmètre des 4 agences IWIGO ECF (configuré d'office). */

export interface Agency {
  slug: string;
  name: string;
  city: string;
  postal_code: string;
  department: string;
  covered_cities: Array<{ name: string; postal_code: string }>;
  instagram_url?: string;
  facebook_url?: string;
}

export const AGENCIES: Agency[] = [
  {
    slug: "melun", name: "IWIGO ECF Melun", city: "Melun", postal_code: "77000", department: "77",
    instagram_url: "https://www.instagram.com/iwigopermis_melun/",
    facebook_url: "https://www.facebook.com/p/Iwigo-Permis-Melun-100063569949985/?locale=fr_FR",
    covered_cities: [
      { name: "Dammarie-les-Lys", postal_code: "77190" }, { name: "Le Mée-sur-Seine", postal_code: "77350" },
      { name: "Vaux-le-Pénil", postal_code: "77000" }, { name: "La Rochette", postal_code: "77000" },
      { name: "Rubelles", postal_code: "77950" }, { name: "Maincy", postal_code: "77950" },
      { name: "Boissise-le-Roi", postal_code: "77310" }, { name: "Saint-Fargeau-Ponthierry", postal_code: "77310" },
      { name: "Livry-sur-Seine", postal_code: "77000" },
    ],
  },
  {
    slug: "savigny-le-temple", name: "IWIGO ECF Savigny-le-Temple", city: "Savigny-le-Temple", postal_code: "77176", department: "77",
    instagram_url: "https://www.instagram.com/iwigopermis_melun/",
    facebook_url: "https://www.facebook.com/p/Iwigo-Permis-Savigny-100053445225017/?locale=fr_FR",
    covered_cities: [
      { name: "Nandy", postal_code: "77176" }, { name: "Cesson", postal_code: "77240" },
      { name: "Vert-Saint-Denis", postal_code: "77240" }, { name: "Moissy-Cramayel", postal_code: "77550" },
      { name: "Lieusaint", postal_code: "77127" }, { name: "Réau", postal_code: "77550" },
    ],
  },
  {
    slug: "le-chatelet-en-brie", name: "IWIGO ECF Le Châtelet-en-Brie", city: "Le Châtelet-en-Brie", postal_code: "77820", department: "77",
    instagram_url: "https://www.instagram.com/iwigopermis_melun/",
    facebook_url: "https://www.facebook.com/p/Iwigo-Permis-Le-Chatelet-100049723672955/",
    covered_cities: [
      { name: "Fontaine-le-Port", postal_code: "77590" }, { name: "Chartrettes", postal_code: "77590" },
      { name: "Sivry-Courtry", postal_code: "77115" }, { name: "Blandy", postal_code: "77115" },
      { name: "Féricy", postal_code: "77133" }, { name: "Machault", postal_code: "77133" },
      { name: "Les Écrennes", postal_code: "77820" }, { name: "Échouboulains", postal_code: "77830" },
    ],
  },
  {
    // NB : Saint-Pierre-du-Perray est en Essonne (91), limitrophe de la Seine-et-Marne.
    slug: "saint-pierre-du-perray", name: "IWIGO ECF Saint-Pierre-du-Perray", city: "Saint-Pierre-du-Perray", postal_code: "91280", department: "91",
    instagram_url: "https://www.instagram.com/iwigopermis_melun/",
    facebook_url: "https://www.facebook.com/p/Iwigo-Permis-Melun-100063569949985/?locale=fr_FR",
    covered_cities: [
      { name: "Corbeil-Essonnes", postal_code: "91100" }, { name: "Saint-Germain-lès-Corbeil", postal_code: "91250" },
      { name: "Tigery", postal_code: "91250" }, { name: "Saintry-sur-Seine", postal_code: "91250" },
      { name: "Morsang-sur-Seine", postal_code: "91250" }, { name: "Étiolles", postal_code: "91450" },
    ],
  },
];

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Attribue une agence à partir d'une ville ou d'un code postal libre. */
export function resolveAgency(cityOrText?: string | null): Agency | null {
  if (!cityOrText) return null;
  const t = norm(cityOrText);
  for (const a of AGENCIES) {
    if (t.includes(norm(a.city)) || cityOrText.includes(a.postal_code)) return a;
  }
  for (const a of AGENCIES) {
    if (a.covered_cities.some((c) => t.includes(norm(c.name)))) return a;
  }
  return null;
}

export function localHashtags(agency?: Agency | null): string[] {
  const base = ["#SeineEtMarne", "#77", "#PermisDeConduire", "#AutoEcoleECF", "#IWIGO"];
  if (!agency) return base;
  return [...base, "#" + agency.city.replace(/[^A-Za-zÀ-ÿ]/g, ""), ...(agency.department === "91" ? ["#Essonne", "#91"] : [])];
}

export async function runLocalContext() {
  return logRun("local_context", async () => {
    const { error } = await db().from("agencies").upsert(AGENCIES, { onConflict: "slug" });
    if (error) throw error;
    return { items: AGENCIES.length, result: AGENCIES };
  });
}
