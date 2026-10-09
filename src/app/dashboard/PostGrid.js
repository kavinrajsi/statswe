"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Heart, Layers, MessageCircle, Play } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BarChart from "./BarChart";

// Grid of post tiles. Clicking a tile opens the insights sheet from the right.
export default function PostGrid({ posts }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1 sm:gap-4">
        {posts.map((post) => (
          <PostTile key={post.ig_id} post={post} onOpen={() => setSelected(post)} />
        ))}
      </ul>

      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {selected && <PostInsights key={selected.ig_id} post={selected} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

function PostTile({ post, onOpen }) {
  const image =
    post.thumbnail_url ?? post.media_url ?? post.children?.find((c) => c.media_url)?.media_url;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group relative block aspect-square w-full overflow-hidden rounded-md bg-muted"
      >
        {image && (
          <Image
            src={image}
            alt={post.caption?.slice(0, 100) ?? "Instagram post"}
            fill
            sizes="(min-width: 640px) 293px, 33vw"
            className="object-cover"
          />
        )}

        {post.media_type === "CAROUSEL_ALBUM" && (
          <span className="absolute top-2 right-2 text-white drop-shadow">
            <Layers className="h-4 w-4" />
          </span>
        )}
        {post.media_type === "VIDEO" && (
          <span className="absolute top-2 right-2 text-white drop-shadow">
            <Play className="h-4 w-4" />
          </span>
        )}

        <span className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/40 text-base font-semibold text-white group-hover:flex">
          <span className="flex items-center gap-1.5">
            <Heart className="h-4 w-4" /> {post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" /> {post.comments_count ?? 0}
          </span>
        </span>
      </button>
    </li>
  );
}

// Insights for one post, loaded when the sheet opens.
function PostInsights({ post }) {
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
    <>
      <SheetHeader>
        <SheetTitle>Post insights</SheetTitle>
        <SheetDescription>Metrics as reported by Instagram.</SheetDescription>
      </SheetHeader>

      <div className="flex gap-4 py-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
          {thumb && <Image src={thumb} alt="" fill sizes="64px" className="object-cover" />}
        </div>
        <div className="min-w-0 space-y-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">{post.caption ?? "No caption"}</p>
          <Button variant="link" size="sm" className="h-auto p-0" asChild>
            <a href={post.permalink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
              Open on Instagram
            </a>
          </Button>
        </div>
      </div>

      <Separator />

      {loading && (
        <div className="space-y-3 py-6">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {!loading && failed && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>
            Could not load insights. Log in again so the app gets the insights permission.
          </AlertDescription>
        </Alert>
      )}
      {!loading && !failed && data?.error && (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>Meta returned: {data.error}</AlertDescription>
        </Alert>
      )}

      {!loading && !failed && data && (
        <div className="space-y-6 py-4">
          <Section title="Views" value={m.views}>
            <SplitBar label="Followers" percent={followerPct} />
            <SplitBar label="Non-followers" percent={nonFollowerPct} />
            {followerViews === null && (
              <p className="text-xs text-muted-foreground">
                Followers / non-followers split is not available from Meta for this post.
              </p>
            )}
          </Section>

          <Section title="Interactions" value={m.total_interactions}>
            <Row label="Likes" value={m.likes} />
            <Row label="Comments" value={m.comments} />
            <Row label="Saves" value={m.saved} />
            <Row label="Shares" value={m.shares} />
          </Section>

          <Section title="Reach" value={m.reach}>
            <p className="text-xs text-muted-foreground">
              &quot;From Home&quot; and &quot;From profile&quot; breakdowns are not available from Meta&apos;s API.
            </p>
          </Section>

          <Separator />

          <section className="space-y-3">
            <p className="text-sm font-medium">Day by day</p>
            {history === null && <Skeleton className="h-40 w-full" />}
            {history !== null && history.length === 0 && (
              <p className="text-xs text-muted-foreground">
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
            <Badge variant="outline" className="font-normal">
              Totals as of each day · kept for 90 days
            </Badge>
          </section>
        </div>
      )}
    </>
  );
}

function Section({ title, value, children }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between text-sm font-medium">
        <span>{title}</span>
        <span>{format(value)}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{label}</span>
      <span>{format(value)}</span>
    </div>
  );
}

function SplitBar({ label, percent }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{percent === null ? "–" : `${percent.toFixed(1)}%`}</span>
      </div>
      <Progress value={percent ?? 0} />
    </div>
  );
}

function pct(part, total) {
  if (part === null || !total) return null;
  return (part / total) * 100;
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}
