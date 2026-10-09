"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPE_LABELS = { all: "All", posts: "Posts", reels: "Reels", stories: "Stories" };
const METRIC_LABELS = {
  accounts: "Accounts engaged",
  interactions: "Interactions",
  shares: "Shares",
  viewers: "Viewers",
  views: "Views",
};
const SORT_LABELS = { newest: "Newest", highest: "Highest", lowest: "Lowest" };
const RANGE_LABELS = { 7: "Last 7 days", 14: "Last 14 days", 30: "Last 30 days", 90: "Last 90 days" };
const OTHER_METRICS = [
  ["views", "Views"],
  ["viewers", "Viewers"],
  ["interactions", "Interactions"],
  ["shares", "Shares"],
];
const KIND_LABELS = { post: "Post", reel: "Reel", story: "Story" };

// Posts, reels and stories as a grid. Filter by type, metric, sort and date range (publish date).
export default function ContentInsights({ accountId }) {
  const [type, setType] = useState("all");
  const [metric, setMetric] = useState("views");
  const [sort, setSort] = useState("newest");
  const [range, setRange] = useState(7);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const q = new URLSearchParams({ account: accountId, type, metric, sort, range: String(range) });
    fetch(`/api/instagram/content-insights?${q}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [accountId, type, metric, sort, range]);

  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load content insights. Log in again if this persists.</AlertDescription>
      </Alert>
    );
  }
  if (!data) return <Skeleton className="h-[32rem]" />;

  // While a new filter loads, the previous result stays on screen, dimmed
  const stale = data.type !== type || data.metric !== metric || data.sort !== sort || data.days !== range;
  // "Accounts engaged" has no per-item value, so the cards show Views for it
  const bigMetric = metric === "accounts" ? "views" : metric;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-base">Content insights</CardTitle>
          <CardDescription>
            {RANGE_LABELS[range]} · posts listed by publish date · numbers for this period
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={type} onValueChange={setType}>
            <TabsList>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex flex-wrap gap-2">
            <Menu label={METRIC_LABELS[metric]} options={METRIC_LABELS} value={metric} onChange={setMetric} />
            <Menu label={SORT_LABELS[sort]} options={SORT_LABELS} value={sort} onChange={setSort} />
            <Menu label={RANGE_LABELS[range]} options={RANGE_LABELS} value={range} onChange={(v) => setRange(Number(v))} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="text-xs text-muted-foreground">Accounts engaged · last {data.engagedDays} days</p>
          <p className="mt-1 text-2xl font-semibold">{format(data.accountsEngaged)}</p>
          {data.days > 30 && (
            <p className="mt-1 text-xs text-muted-foreground">Meta counts accounts over 30 days at most, so this shows the last 30.</p>
          )}
        </div>

        {data.earliestSnapshot && data.items.some((i) => i.views === null) && (
          <p className="text-xs text-muted-foreground">
            Period numbers come from daily snapshots, which start on {data.earliestSnapshot}. Older posts show &ldquo;–&rdquo; until
            enough history builds up.
          </p>
        )}

        {data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {type === "stories"
              ? "No stories captured yet. They appear after the daily capture."
              : "No content published in this range."}
          </p>
        ) : (
          <ul className={`grid grid-cols-2 gap-4 transition-opacity sm:grid-cols-3 lg:grid-cols-4 ${stale ? "opacity-50" : ""}`}>
            {data.items.map((item, i) => (
              <ContentCard key={item.ig_id} rank={i + 1} item={item} metric={bigMetric} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ContentCard({ rank, item, metric }) {
  const image = item.thumbnail_url ?? item.media_url;
  const engagement =
    item.views && item.interactions != null ? `${((item.interactions / item.views) * 100).toFixed(1)}%` : "–";

  return (
    <li className="space-y-2">
      <a
        href={item.permalink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open on Instagram"
        className="group relative block aspect-square overflow-hidden rounded-lg bg-muted"
      >
        {image && <Image src={image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />}
        <span className="absolute top-2 left-2 rounded-md bg-black px-2 py-0.5 text-xs font-bold text-white shadow">
          #{rank}
        </span>
        <span className="absolute top-2 right-2">
          <Badge variant="secondary" className="font-normal">
            {KIND_LABELS[item.kind]}
          </Badge>
        </span>
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-black/85 px-2.5 py-2 text-white">
          <span className="text-lg font-semibold leading-none">{format(item[metric])}</span>
          <span className="text-xs opacity-80">{metricLabel(metric)}</span>
        </span>
      </a>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(item.ts).toLocaleDateString()}</span>
        <span>Engagement {engagement}</span>
      </div>
      <dl className="grid grid-cols-3 gap-1 text-xs">
        {OTHER_METRICS.filter(([key]) => key !== metric)
          .slice(0, 3)
          .map(([key, label]) => (
            <div key={key}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{format(item[key])}</dd>
            </div>
          ))}
      </dl>
    </li>
  );
}

function metricLabel(key) {
  return METRIC_LABELS[key] ?? key;
}

function Menu({ label, options, value, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {label}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(options).map(([key, text]) => (
          <DropdownMenuItem key={key} onClick={() => onChange(key)} className={String(value) === key ? "font-semibold" : ""}>
            {text}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}
