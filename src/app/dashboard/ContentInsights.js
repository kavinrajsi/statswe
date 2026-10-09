"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown, ExternalLink, LayoutGrid, List } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostInsights from "./PostInsights";

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
const DETAIL_METRICS = [
  ["views", "Views"],
  ["viewers", "Viewers"],
  ["interactions", "Interactions"],
  ["shares", "Shares"],
  ["likes", "Likes"],
  ["comments", "Comments"],
  ["saves", "Saves"],
];
const KIND_LABELS = { post: "Post", reel: "Reel", story: "Story" };
const VIEWS = ["grid", "table"];

// Posts, reels and stories as a grid or table. Filter by type, metric, sort and date range (publish date).
// Click an item (not a story) to open its full insights.
export default function ContentInsights({ accountId }) {
  const [type, setType] = useState("all");
  const [metric, setMetric] = useState("views");
  const [sort, setSort] = useState("newest");
  const [range, setRange] = useState(7);
  const [view, setView] = useState("grid");
  const [selected, setSelected] = useState(null);
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
  const openItem = (item) => {
    if (item.kind === "story") window.open(item.permalink, "_blank", "noopener,noreferrer");
    else setSelected(item);
  };

  return (
    <>
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
            <div className="flex flex-wrap items-center gap-2">
              <Menu label={METRIC_LABELS[metric]} options={METRIC_LABELS} value={metric} onChange={setMetric} />
              <Menu label={SORT_LABELS[sort]} options={SORT_LABELS} value={sort} onChange={setSort} />
              <Menu label={RANGE_LABELS[range]} options={RANGE_LABELS} value={range} onChange={(v) => setRange(Number(v))} />
              <ViewSwitch value={view} onChange={setView} />
            </div>
          </div>
        </CardHeader>

        <CardContent className={`space-y-5 transition-opacity ${stale ? "opacity-50" : ""}`}>
          <Summary data={data} />

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
          ) : view === "grid" ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {data.items.map((item, i) => (
                <ContentCard key={item.ig_id} rank={i + 1} item={item} metric={bigMetric} onOpen={openItem} />
              ))}
            </ul>
          ) : (
            <ContentTable items={data.items} metric={bigMetric} onOpen={openItem} />
          )}
        </CardContent>
      </Card>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected && <PostInsights key={selected.ig_id} post={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

// Range totals above the list. Viewers is a sum over posts, so it can count the same account twice.
function Summary({ data }) {
  const t = data.totals ?? {};
  const tiles = [
    { label: `Accounts engaged · last ${data.engagedDays} days`, value: data.accountsEngaged, note: data.days > 30 ? "Meta counts at most 30 days" : null },
    { label: "Views", value: t.views },
    { label: "Viewers (sum)", value: t.viewers },
    { label: "Interactions", value: t.interactions },
    { label: "Shares", value: t.shares },
    { label: "Items", value: t.count },
    { label: "Avg engagement", value: t.engagementRate == null ? null : `${t.engagementRate.toFixed(1)}%` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">{tile.label}</p>
          <p className="mt-1 text-xl font-semibold">{typeof tile.value === "string" ? tile.value : format(tile.value)}</p>
          {tile.note && <p className="mt-1 text-xs text-muted-foreground">{tile.note}</p>}
        </div>
      ))}
    </div>
  );
}

function ContentCard({ rank, item, metric, onOpen }) {
  const image = item.thumbnail_url ?? item.media_url;
  const engagement =
    item.views && item.interactions != null ? `${((item.interactions / item.views) * 100).toFixed(1)}%` : "–";

  return (
    <li className="space-y-2">
      <div className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
        <button
          type="button"
          onClick={() => onOpen(item)}
          aria-label={item.kind === "story" ? "Open story on Instagram" : "Open post insights"}
          className="absolute inset-0 block"
        >
          {image && <Image src={image} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />}
        </button>
        <span className="pointer-events-none absolute top-2 left-2 rounded-md bg-black px-2 py-0.5 text-xs font-bold text-white shadow">
          #{rank}
        </span>
        <span className="pointer-events-none absolute top-2 right-2">
          <Badge variant="secondary" className="font-normal">
            {KIND_LABELS[item.kind]}
          </Badge>
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-black/85 px-2.5 py-2 text-white">
          <span className="text-lg font-semibold leading-none">{format(item[metric])}</span>
          <span className="text-xs opacity-80">{metricLabel(metric)}</span>
        </span>
      </div>

      {item.caption && <p className="line-clamp-2 text-xs">{item.caption}</p>}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{new Date(item.ts).toLocaleDateString()}</span>
        <span className="flex items-center gap-2">
          Engagement {engagement}
          <a href={item.permalink} target="_blank" rel="noopener noreferrer" aria-label="Open on Instagram" className="hover:text-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </span>
      </div>
      <dl className="grid grid-cols-4 gap-x-2 gap-y-1 text-xs">
        {DETAIL_METRICS.map(([key, label]) => (
          <div key={key}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={`font-medium ${key === metric ? "text-foreground" : ""}`}>{format(item[key])}</dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

function ContentTable({ items, metric, onOpen }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">#</TableHead>
            <TableHead>Content</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Date</TableHead>
            {DETAIL_METRICS.map(([key, label]) => (
              <TableHead key={key} className={`text-right ${key === metric ? "text-foreground" : ""}`}>
                {label}
              </TableHead>
            ))}
            <TableHead className="text-right">Engagement</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, i) => {
            const image = item.thumbnail_url ?? item.media_url;
            const engagement =
              item.views && item.interactions != null ? `${((item.interactions / item.views) * 100).toFixed(1)}%` : "–";
            return (
              <TableRow key={item.ig_id} className="cursor-pointer" onClick={() => onOpen(item)}>
                <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {image && <Image src={image} alt="" fill sizes="40px" className="object-cover" />}
                    </span>
                    <span className="line-clamp-2 max-w-[18rem] text-xs">{item.caption ?? "–"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-normal">
                    {KIND_LABELS[item.kind]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">{new Date(item.ts).toLocaleDateString()}</TableCell>
                {DETAIL_METRICS.map(([key]) => (
                  <TableCell key={key} className={`text-right ${key === metric ? "font-semibold" : ""}`}>
                    {format(item[key])}
                  </TableCell>
                ))}
                <TableCell className="text-right">{engagement}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function ViewSwitch({ value, onChange }) {
  const icons = { grid: LayoutGrid, table: List };
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        {VIEWS.map((key) => {
          const Icon = icons[key];
          return (
            <TabsTrigger key={key} value={key} aria-label={`${key} view`}>
              <Icon className="h-4 w-4" />
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
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
