"use client";

import { geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";

const W = 600;
const H = 380;
const COUNTRIES = feature(world, world.objects.countries).features;

// Countries shaded by share of the audience. rows: [{ key, numeric, value }]
export function CountryMap({ rows }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  const share = new Map(rows.filter((r) => r.numeric).map((r) => [r.numeric, total > 0 ? r.value / total : 0]));
  const max = Math.max(0.0001, ...share.values());
  const projection = geoNaturalEarth1().fitExtent(
    [
      [4, 4],
      [W - 4, H - 4],
    ],
    { type: "Sphere" }
  );
  const path = geoPath(projection);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Audience by country">
        {COUNTRIES.map((c, i) => {
          const s = share.get(String(c.id)) ?? 0;
          return (
            <path
              key={i}
              d={path(c)}
              style={s > 0 ? { fill: "var(--chart-1)", fillOpacity: 0.2 + 0.8 * (s / max) } : { fill: "var(--muted)" }}
              stroke="var(--background)"
              strokeWidth={0.5}
            >
              <title>{`${c.properties?.name ?? ""}${s > 0 ? `: ${Math.round(s * 1000) / 10}%` : ""}`}</title>
            </path>
          );
        })}
      </svg>
      <ShareLegend label="Darker = larger share" />
    </div>
  );
}

// City dots sized by share over a faint world outline. rows: [{ key, lat, lon, value }], only rows with coordinates are drawn.
export function CityMap({ rows }) {
  const points = rows.filter((r) => r.lat != null && r.lon != null);
  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Locations not available for these cities.</p>;
  }
  const total = rows.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...points.map((p) => p.value));
  const topThree = new Set([...points].sort((a, b) => b.value - a.value).slice(0, 3).map((p) => p.key));

  const coords = points.map((p) => [p.lon, p.lat]);
  const projection =
    points.length > 1
      ? geoMercator().fitExtent(
          [
            [24, 24],
            [W - 24, H - 24],
          ],
          { type: "MultiPoint", coordinates: coords }
        )
      : geoMercator().center(coords[0]).scale(900).translate([W / 2, H / 2]);
  const path = geoPath(projection);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Audience by city">
        {COUNTRIES.map((c, i) => (
          <path key={i} d={path(c) ?? ""} style={{ fill: "var(--muted)" }} stroke="var(--background)" strokeWidth={0.5} />
        ))}
        {points.map((p) => {
          const [x, y] = projection([p.lon, p.lat]) ?? [0, 0];
          const r = 4 + 10 * (p.value / max);
          const pct = total > 0 ? Math.round((p.value / total) * 1000) / 10 : 0;
          return (
            <g key={p.key}>
              <circle cx={x} cy={y} r={r} style={{ fill: "var(--chart-1)", fillOpacity: 0.75 }} stroke="var(--background)" strokeWidth={1}>
                <title>{`${p.key}: ${pct}%`}</title>
              </circle>
              {topThree.has(p.key) && (
                <text x={x + r + 4} y={y + 4} fontSize={12} fontWeight={600} style={{ fill: "var(--foreground)" }}>
                  {p.key.split(",")[0]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <ShareLegend label="Bigger dot = larger share" />
    </div>
  );
}

// Small colour scale under a map.
function ShareLegend({ label }) {
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
      <span>Less</span>
      {[0.2, 0.45, 0.7, 1].map((o) => (
        <span key={o} className="h-3 w-3 rounded-[3px]" style={{ background: "var(--chart-1)", opacity: o }} />
      ))}
      <span>More</span>
      <span className="ml-2">· {label}</span>
    </div>
  );
}
