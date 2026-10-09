"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import ContentTypeBars from "./ContentTypeBars";
import DonutChart from "./DonutChart";
import { PeriodMenu } from "./PeriodMenu";

// Views and interactions for the account, with a period picker. Follower split comes from Meta's breakdowns.
export default function AudienceInsights({ accountId }) {
  const [period, setPeriod] = useState("mtd");
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/audience-insights?account=${encodeURIComponent(accountId)}&period=${period}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [accountId, period]);

  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load views and interactions. Log in again if this persists.</AlertDescription>
      </Alert>
    );
  }
  if (!data) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[30rem]" />
        <Skeleton className="h-[30rem]" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ViewsCard data={data} period={period} onPeriod={setPeriod} />
      <InteractionsCard data={data} period={period} onPeriod={setPeriod} />
    </div>
  );
}

function ViewsCard({ data, period, onPeriod }) {
  const v = data.views;
  const followers = v.followers ?? 0;
  const nonFollowers = v.nonFollowers ?? 0;
  const splitTotal = followers + nonFollowers;
  const followerPct = splitTotal > 0 ? (followers / splitTotal) * 100 : null;
  const nonFollowerPct = splitTotal > 0 ? (nonFollowers / splitTotal) * 100 : null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Views</CardTitle>
          <CardDescription>
            {rangeLabel(data.range)}
            {data.approximate && " · approximate"}
          </CardDescription>
        </div>
        <PeriodMenu value={period} onChange={onPeriod} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <DonutChart
            slices={[
              { name: "Followers", value: followers, color: "var(--chart-1)" },
              { name: "Non-followers", value: nonFollowers, color: "var(--chart-2)" },
            ]}
            centerValue={format(v.total)}
            centerLabel={v.adsPct != null ? `${v.adsPct.toFixed(1)}% from ads` : "views"}
          />
          <div className="space-y-3">
            <SplitRow label="Followers" color="var(--chart-1)" value={v.followers} pct={followerPct} />
            <SplitRow label="Non-followers" color="var(--chart-2)" value={v.nonFollowers} pct={nonFollowerPct} />
          </div>
        </div>

        <Separator />

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Viewers</p>
            <p className="text-2xl font-semibold">{format(data.viewers.total)}</p>
          </div>
          <Change pct={data.viewers.changePct} />
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">By content type</p>
          <ContentTypeBars byType={v.byType} />
        </div>
      </CardContent>
    </Card>
  );
}

function InteractionsCard({ data, period, onPeriod }) {
  const i = data.interactions;
  const byType = i.byType;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Interactions</CardTitle>
          <CardDescription>{rangeLabel(data.range)}</CardDescription>
        </div>
        <PeriodMenu value={period} onChange={onPeriod} />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <DonutChart
            slices={[
              { name: "Reels", value: byType?.reels ?? 0, color: "var(--chart-1)" },
              { name: "Posts", value: byType?.posts ?? 0, color: "var(--chart-2)" },
              { name: "Stories", value: byType?.stories ?? 0, color: "var(--chart-3)" },
            ]}
            centerValue={format(i.total)}
            centerLabel="interactions"
          />
          <p className="text-sm text-muted-foreground">
            Meta does not split interactions by follower type, so this shows the content type instead.
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <p className="text-sm font-medium">By content type</p>
          <ContentTypeBars byType={byType ? { all: byType } : null} />
        </div>
      </CardContent>
    </Card>
  );
}

function SplitRow({ label, color, value, pct }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="text-muted-foreground">{pct === null ? "–" : `${pct.toFixed(1)}%`}</span>
      </div>
      <p className="pl-[18px] text-lg font-semibold">{format(value)}</p>
    </div>
  );
}

function Change({ pct }) {
  if (pct === null || pct === undefined) return <span className="text-sm text-muted-foreground">–</span>;
  const up = pct >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${up ? "text-emerald-600" : "text-destructive"}`}>
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(pct).toFixed(1)}% vs previous period
    </span>
  );
}

function rangeLabel(range) {
  if (!range) return "";
  return `${dayLabel(range.start)} – ${dayLabel(range.end)}`;
}

// "2026-10-01" -> "01 Oct"
function dayLabel(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}
