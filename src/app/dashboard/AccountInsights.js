"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BarChart from "./BarChart";
import AudienceInsights from "./AudienceInsights";
import TopContent from "./TopContent";
import ContentInsights from "./ContentInsights";
import Demographics from "./Demographics";
import ActiveTimes from "./ActiveTimes";
import MonthlyMetrics from "./MonthlyMetrics";
import { PeriodToggle } from "./PeriodToggle";
import FollowersGrowth from "./FollowersGrowth";

// Last 30 days of account-level insights, fetched live from Meta.
// children are rendered in the second row, next to the followers-by-month card.
export default function AccountInsights({ accountId, children }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [chartPeriod, setChartPeriod] = useState("mtd");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/account-insights?account=${encodeURIComponent(accountId)}&period=${chartPeriod}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [accountId, chartPeriod]);

  if (failed) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>Could not load account insights. Log in again if this persists.</AlertDescription>
        </Alert>
        <div className="grid gap-6 lg:grid-cols-2">{children}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const days = data.days ?? [];
  const toggle = <PeriodToggle value={chartPeriod} onChange={setChartPeriod} />;
  const chartLabel =
    data.chartPeriod === "mtd" && data.chartStart
      ? `${dayLabel(data.chartStart)} – ${dayLabel(data.chartEnd)}`
      : "Last 30 days";
  // Unique reach from Meta; fall back to summing daily values if it's unavailable
  const reachTotal = data.reachTotal ?? days.reduce((sum, d) => sum + (d.reach ?? 0), 0);
  const period =
    data.periodStart && data.periodEnd
      ? `${dayLabel(data.periodStart)} – ${dayLabel(data.periodEnd)}`
      : "Month to date";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard title="Reach" period={period} value={reachTotal} />
        <StatCard title="Views" period={period} value={data.views} />
        <StatCard title="Profile visits" period={period} value={data.profileViews} />
      </div>

      <ReachCard days={days} error={data.error} label={chartLabel} action={toggle} />
      <FollowersGrowth
        points={followerSeries(days, data.followers)}
        periodLabel={chartLabel}
        action={toggle}
      />

      <AudienceInsights accountId={accountId} />

      <TopContent accountId={accountId} />

      <ContentInsights accountId={accountId} />

      <Demographics accountId={accountId} />

      <ActiveTimes accountId={accountId} />

      <div className="grid gap-6 lg:grid-cols-2">
        {data.monthly && <MonthlyMetrics rows={data.monthly} />}
        {children}
      </div>
    </div>
  );
}

function StatCard({ title, period, value }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <p className="text-xs text-muted-foreground">{period}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{format(value)}</p>
      </CardContent>
    </Card>
  );
}

function ReachCard({ days, error, label, action }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Reach</CardTitle>
          <CardDescription>Daily reach, {label}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No daily data returned by Meta for this window.</p>
        ) : (
          <BarChart
            data={days.map((d) => ({ label: d.date, short: d.date.slice(5), value: d.reach }))}
            yLabel="Reach"
            xLabel="Date"
          />
        )}

        {days.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
              Day by day
              <ChevronDown className="h-4 w-4" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Followers (net)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...days].reverse().map((d) => (
                    <TableRow key={d.date}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell className="text-right">{format(d.reach)}</TableCell>
                      <TableCell className="text-right">{signedFormat(d.follower_count)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CollapsibleContent>
          </Collapsible>
        )}

        {error && <p className="text-xs text-destructive">Meta returned: {error}</p>}
      </CardContent>
    </Card>
  );
}

// Follower total per day. Starts from today's count and walks back by Meta's daily net change.
function followerSeries(days, current) {
  if (current === null || current === undefined || days.length === 0) return [];
  const series = [];
  let total = current;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    series.unshift({ date: days[i].date, followers: total });
    total -= days[i].follower_count ?? 0;
  }
  return series;
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}

// "2026-10-01" -> "01 Oct"
function dayLabel(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
}

function signedFormat(value) {
  if (value === null || value === undefined) return "–";
  return `${value > 0 ? "+" : ""}${Number(value).toLocaleString()}`;
}
