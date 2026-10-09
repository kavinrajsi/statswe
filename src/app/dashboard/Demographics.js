"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CityMap, CountryMap } from "./AudienceMaps";

const AGE_ORDER = ["13-17", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const TOP = 5;

// Age range, country and city of the followers and of the reached audience. Bars show each group's share.
export default function Demographics({ accountId }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/demographics?account=${encodeURIComponent(accountId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load audience demographics. Log in again if this persists.</AlertDescription>
      </Alert>
    );
  }
  if (!data) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <AudienceCard title="Followers" data={data.followers} />
        <AudienceCard title="Reached audience" data={data.reached} />
      </div>
      <LocationsCard followers={data.followers} reached={data.reached} />
    </div>
  );
}

// Age range of one audience.
function AudienceCard({ title, data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{data?.period}</CardDescription>
      </CardHeader>
      <CardContent>
        <Section title="Age range" rows={ageRows(data?.age)} />
      </CardContent>
    </Card>
  );
}

// Countries and cities of the chosen audience, with a large map of each side by side.
function LocationsCard({ followers, reached }) {
  const [audience, setAudience] = useState("followers");
  const d = audience === "followers" ? followers : reached;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Audience locations</CardTitle>
          <CardDescription>{d?.period}</CardDescription>
        </div>
        <Tabs value={audience} onValueChange={setAudience}>
          <TabsList>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="reached">Reached audience</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Section title="Top countries" rows={topRows(d?.country, countryName)} />
          {d?.country && <CountryMap rows={d.country} />}
        </div>
        <div className="space-y-4">
          <Section title="Top cities" rows={topRows(d?.city, (k) => k)} />
          {d?.city && <CityMap rows={topCityRows(d.city)} />}
        </div>
      </CardContent>
    </Card>
  );
}

// The 10 largest cities, with coordinates when they were found.
function topCityRows(rows) {
  return [...rows].sort((a, b) => b.value - a.value).slice(0, 10);
}

function Section({ title, rows }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      {rows === null && <p className="text-sm text-muted-foreground">Not available from Meta for this account.</p>}
      {rows !== null && rows.length === 0 && <p className="text-sm text-muted-foreground">No data for this period.</p>}
      {rows?.map((r) => (
        <div key={r.label} className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span>{r.label}</span>
            <span className="text-muted-foreground">{r.pct.toFixed(1)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-[var(--chart-1)]" style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Every age bucket in age order, so both cards list the same groups. Empty groups show 0%.
function ageRows(rows) {
  if (!rows) return null;
  const total = rows.reduce((s, r) => s + r.value, 0);
  const valueOf = new Map(rows.map((r) => [r.key, r.value]));
  return AGE_ORDER.map((label) => {
    const value = valueOf.get(label) ?? 0;
    return { label, pct: total > 0 ? (value / total) * 100 : 0 };
  });
}

// Largest groups first, with a share of the total. Only the top few are shown.
function topRows(rows, label) {
  if (!rows) return null;
  const total = rows.reduce((s, r) => s + r.value, 0);
  return [...rows]
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP)
    .map((r) => ({ label: label(r.key), pct: total > 0 ? (r.value / total) * 100 : 0 }));
}

// "IN" -> "🇮🇳 India"
function countryName(code) {
  let name = code;
  try {
    name = new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    name = code;
  }
  return `${flagOf(code)} ${name}`;
}

// Two-letter region code to its flag emoji (regional indicator letters). Unknown codes give no flag.
function flagOf(code) {
  if (!/^[A-Z]{2}$/.test(code)) return "";
  return String.fromCodePoint(...[...code].map((c) => 127397 + c.charCodeAt(0)));
}
