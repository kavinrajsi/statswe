import countries from "i18n-iso-countries";
import { sql } from "@/lib/db";

const MAX_NEW_LOOKUPS = 15;

// ISO alpha-2 code ("IN") -> the numeric id used by the world map ("356"). Null if unknown.
export function numericCountry(alpha2) {
  return countries.alpha2ToNumeric(alpha2) ?? null;
}

// "Chennai, Tamil Nadu" -> { name: "Chennai", region: "Tamil Nadu" }
function parseCity(label) {
  const [name, ...rest] = label.split(",");
  return { name: name.trim(), region: rest.join(",").trim() };
}

// Coordinates for city labels from Meta. Known cities come from city_geo; new ones are looked up on the
// free Open-Meteo geocoder (only the city name is sent) and saved. Returns Map(label -> { lat, lon } | null).
export async function resolveCities(labels) {
  const unique = [...new Set(labels)];
  const known = await sql`select name, lat, lon from city_geo where name = any(${unique})`;
  const result = new Map(known.map((r) => [r.name, r.lat === null ? null : { lat: r.lat, lon: r.lon }]));

  const missing = unique.filter((label) => !result.has(label)).slice(0, MAX_NEW_LOOKUPS);
  await Promise.all(
    missing.map(async (label) => {
      const { name, region } = parseCity(label);
      let found = null;
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?count=10&language=en&name=${encodeURIComponent(name)}`
        );
        const json = await res.json();
        const candidates = json.results ?? [];
        const hit =
          candidates.find((c) => c.country_code === "IN" && c.admin1?.toLowerCase() === region.toLowerCase()) ??
          candidates.find((c) => c.admin1?.toLowerCase() === region.toLowerCase()) ??
          null;
        found = hit ? { lat: hit.latitude, lon: hit.longitude } : null;
      } catch {
        found = null; // a failed lookup is not saved, so it is retried next time
        result.set(label, null);
        return;
      }
      await sql`
        insert into city_geo (name, lat, lon, looked_up_at)
        values (${label}, ${found?.lat ?? null}, ${found?.lon ?? null}, now())
        on conflict (name) do nothing
      `;
      result.set(label, found);
    })
  );

  return result;
}
