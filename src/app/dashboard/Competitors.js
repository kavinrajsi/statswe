"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CompetitorsGrowthChart from "./CompetitorsGrowthChart";

// Your account next to the saved competitors, from the nightly sync.
export default function Competitors({ accountId }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/competitors?account=${encodeURIComponent(accountId)}`)
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
        <AlertDescription>Could not load competitors. Log in again if this persists.</AlertDescription>
      </Alert>
    );
  }
  if (!data) return <Skeleton className="h-96" />;

  if (data.competitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitors</CardTitle>
          <CardDescription>No competitors saved yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">Add competitors in Settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data.synced) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitors</CardTitle>
          <CardDescription>Not synced yet. Use Sync now to load their stats.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const all = [{ ...data.you, you: true }, ...data.competitors];
  const series = all
    .filter((a) => a.series?.length)
    .map((a) => ({ key: a.username, label: `@${a.username}`, points: a.series }));
  const maxRate = Math.max(0.0001, ...all.map((a) => a.engagementRate ?? 0));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitors</CardTitle>
          <CardDescription>You and your saved competitors · public stats from the last sync</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="text-right">Following</TableHead>
                <TableHead className="text-right">Posts</TableHead>
                <TableHead className="text-right">Followers 30d</TableHead>
                <TableHead className="text-right">Posts 30d</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((a) => (
                <TableRow key={a.username} className={a.you ? "bg-muted/50 font-medium" : ""}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar src={a.pictureUrl} label={a.username} />
                      <span>
                        @{a.username}
                        {a.you && <span className="ml-2 text-xs text-muted-foreground">You</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{format(a.followers)}</TableCell>
                  <TableCell className="text-right">{format(a.following)}</TableCell>
                  <TableCell className="text-right">{format(a.posts)}</TableCell>
                  <TableCell className="text-right">{signed(a.gained30)}</TableCell>
                  <TableCell className="text-right">{format(a.posts30)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Follower growth · last 30 days</CardTitle>
            <CardDescription>Change in followers since the first day, in %</CardDescription>
          </CardHeader>
          <CardContent>
            {series.length ? <CompetitorsGrowthChart series={series} /> : <p className="text-sm text-muted-foreground">Not enough history yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent engagement</CardTitle>
            <CardDescription>Average likes and comments on the last 12 posts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {all.map((a) => (
              <div key={a.username} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span>@{a.username}</span>
                  <span className="text-muted-foreground">
                    {format(round(a.avgLikes))} likes · {format(round(a.avgComments))} comments ·{" "}
                    {a.engagementRate == null ? "–" : `${a.engagementRate.toFixed(2)}%`}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-[var(--chart-1)]"
                    style={{ width: `${((a.engagementRate ?? 0) / maxRate) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top recent post per competitor</CardTitle>
          <CardDescription>Most liked of their latest public posts</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.competitors.map((c) =>
            c.topPost ? (
              <a
                key={c.username}
                href={c.topPost.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group space-y-2"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  {c.topPost.thumbnail_url && (
                    <Image src={c.topPost.thumbnail_url} alt="" fill sizes="(min-width: 1024px) 25vw, 50vw" className="object-cover" />
                  )}
                  <span className="absolute inset-x-0 bottom-0 flex justify-between bg-black/85 px-2.5 py-1.5 text-sm font-semibold text-white">
                    <span>♥ {format(c.topPost.likes)}</span>
                    <span>💬 {format(c.topPost.comments)}</span>
                  </span>
                </div>
                <p className="flex items-center gap-1 text-sm">
                  @{c.username} <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </p>
              </a>
            ) : null
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Avatar({ src, label }) {
  return (
    <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
      {src && <Image src={src} alt={label} fill sizes="32px" className="object-cover" />}
    </span>
  );
}

function round(value) {
  return value == null ? null : Math.round(value);
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}

function signed(value) {
  if (value === null || value === undefined) return "–";
  return `${value > 0 ? "+" : ""}${Number(value).toLocaleString()}`;
}
