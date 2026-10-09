"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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
    <div className="grid gap-6 lg:grid-cols-2">
      <AudienceCard title="Followers" data={data.followers} />
      <AudienceCard title="Reached audience" data={data.reached} />
    </div>
  );
}

function AudienceCard({ title, data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{data?.period}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Section title="Age range" rows={ageRows(data?.age)} />
        <Separator />
        <Section title="Top countries" rows={topRows(data?.country, countryName)} />
        <Separator />
        <Section title="Top cities" rows={topRows(data?.city, (k) => k)} />
      </CardContent>
    </Card>
  );
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

// Age buckets in age order, unknown last.
function ageRows(rows) {
  if (!rows) return null;
  const total = rows.reduce((s, r) => s + r.value, 0);
  return [...rows]
    .sort((a, b) => {
      const ia = AGE_ORDER.indexOf(a.key);
      const ib = AGE_ORDER.indexOf(b.key);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map((r) => ({ label: r.key, pct: total > 0 ? (r.value / total) * 100 : 0 }))
    .filter((r) => r.pct > 0);
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

function countryName(code) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
