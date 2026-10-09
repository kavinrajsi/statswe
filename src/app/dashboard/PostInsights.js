"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BarChart from "./BarChart";

// Insights for one post, shown in the sheet. Loaded when the sheet opens.
export default function PostInsights({ post }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/insights?post=${encodeURIComponent(post.ig_id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [post.ig_id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/post-history?post=${encodeURIComponent(post.ig_id)}`)
      .then((res) => (res.ok ? res.json() : { history: [] }))
      .then((json) => !cancelled && setHistory(json.history ?? []))
      .catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, [post.ig_id]);

  const m = data?.metrics ?? {};
  const f = data?.followers;
  const followerViews = f?.FOLLOWER ?? null;
  const nonFollowerViews = f?.NON_FOLLOWER ?? null;
  const splitTotal = (followerViews ?? 0) + (nonFollowerViews ?? 0);
  const followerPct = pct(followerViews, splitTotal);
  const nonFollowerPct = pct(nonFollowerViews, splitTotal);
  const thumb = post.thumbnail_url ?? post.media_url;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <SheetHeader>
        <SheetTitle>Post insights</SheetTitle>
        <SheetDescription>Metrics as reported by Instagram.</SheetDescription>
      </SheetHeader>

      <Card>
        <CardContent className="flex gap-4 p-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {thumb && <Image src={thumb} alt="" fill sizes="64px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="line-clamp-2 text-sm">{post.caption ?? "No caption"}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{mediaLabel(post.media_type)}</Badge>
              {post.ts && (
                <span className="text-xs text-muted-foreground">{new Date(post.ts).toLocaleDateString()}</span>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href={post.permalink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open on Instagram
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      )}
      {!loading && failed && (
        <Alert variant="destructive">
          <AlertDescription>
            Could not load insights. Log in again so the app gets the insights permission.
          </AlertDescription>
        </Alert>
      )}
      {!loading && !failed && data?.error && (
        <Alert variant="destructive">
          <AlertDescription>Meta returned: {data.error}</AlertDescription>
        </Alert>
      )}

      {!loading && !failed && data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile label="Views" value={m.views} />
            <KpiTile label="Reach" value={m.reach} />
            <KpiTile label="Likes" value={m.likes} />
            <KpiTile label="Comments" value={m.comments} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audience</CardTitle>
              <CardDescription>Who saw this post</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SplitBar label="Followers" value={followerViews} percent={followerPct} />
              <SplitBar label="Non-followers" value={nonFollowerViews} percent={nonFollowerPct} />
              {followerViews === null && (
                <p className="text-xs text-muted-foreground">
                  The followers / non-followers split is not available from Meta for this post.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Engagement</CardTitle>
              <CardDescription>Total interactions: {format(m.total_interactions)}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Stat label="Saves" value={m.saved} />
              <Stat label="Shares" value={m.shares} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Day by day</CardTitle>
              <CardDescription>Totals as of each day, kept for 90 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {history === null && <Skeleton className="h-40" />}
              {history !== null && history.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No daily history yet. Snapshots are taken once a day, so this fills in over time.
                </p>
              )}
              {history !== null && history.length > 0 && (
                <>
                  <BarChart
                    data={history.map((h) => ({
                      label: h.date,
                      short: h.date.slice(5),
                      value: h.metrics?.reach,
                    }))}
                    yLabel="Reach"
                    xLabel="Date"
                    height={200}
                  />
                  <div className="max-h-64 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Reach</TableHead>
                          <TableHead className="text-right">Likes</TableHead>
                          <TableHead className="text-right">Comments</TableHead>
                          <TableHead className="text-right">Shares</TableHead>
                          <TableHead className="text-right">Saves</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...history].reverse().map((row) => (
                          <TableRow key={row.date}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell className="text-right">{format(row.metrics?.reach)}</TableCell>
                            <TableCell className="text-right">{format(row.metrics?.likes)}</TableCell>
                            <TableCell className="text-right">{format(row.metrics?.comments)}</TableCell>
                            <TableCell className="text-right">{format(row.metrics?.shares)}</TableCell>
                            <TableCell className="text-right">{format(row.metrics?.saved)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value }) {
  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{format(value)}</p>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{format(value)}</p>
    </div>
  );
}

function SplitBar({ label, value, percent }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {format(value)} · {percent === null ? "–" : `${percent.toFixed(1)}%`}
        </span>
      </div>
      <Progress value={percent ?? 0} />
    </div>
  );
}

function mediaLabel(type) {
  if (type === "VIDEO") return "Video";
  if (type === "CAROUSEL_ALBUM") return "Carousel";
  return "Photo";
}

function pct(part, total) {
  if (part === null || !total) return null;
  return (part / total) * 100;
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}
