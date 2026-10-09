"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

// Even numbers from 4 to 22
const LIMITS = Array.from({ length: 10 }, (_, i) => 4 + i * 2);

// Top posts by views and by interactions, as a grid. Totals are as of each post's latest daily snapshot.
export default function TopContent({ accountId }) {
  const [limit, setLimit] = useState(6);
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/top-content?account=${encodeURIComponent(accountId)}&limit=${limit}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [accountId, limit]);

  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load top content. Log in again if this persists.</AlertDescription>
      </Alert>
    );
  }

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Top {limit}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
        {LIMITS.map((n) => (
          <DropdownMenuItem key={n} onClick={() => setLimit(n)}>
            Top {n}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );

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
      <TopGrid title="Top content by views" metric="views" rows={data.views} menu={menu} />
      <TopGrid title="Top content by interactions" metric="interactions" rows={data.interactions} menu={menu} />
    </div>
  );
}

function TopGrid({ title, metric, rows, menu }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>Lifetime totals as of the latest snapshot</CardDescription>
        </div>
        {menu}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No snapshots yet. Totals appear after the first daily snapshot.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rows.map((post, i) => (
              <PostTile key={post.ig_id} rank={i + 1} post={post} metric={metric} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function PostTile({ rank, post, metric }) {
  const thumb = post.thumbnail_url ?? post.media_url;
  const value = post[metric];
  return (
    <li>
      <a
        href={post.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-square overflow-hidden rounded-md bg-muted"
      >
        {thumb && (
          <Image
            src={thumb}
            alt={post.caption?.slice(0, 100) ?? "Instagram post"}
            fill
            sizes="(min-width: 640px) 200px, 50vw"
            className="object-cover"
          />
        )}
        <span className="absolute top-2 left-2 rounded-md bg-black px-2 py-0.5 text-xs font-bold text-white shadow">
          #{rank}
        </span>
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/85 px-2.5 py-1.5 text-sm font-semibold text-white">
          <span>{value === null ? "–" : Number(value).toLocaleString()}</span>
          <span className="text-xs font-normal opacity-80">{mediaLabel(post.media_type)}</span>
        </span>
      </a>
    </li>
  );
}

function mediaLabel(type) {
  if (type === "VIDEO") return "Video";
  if (type === "CAROUSEL_ALBUM") return "Carousel";
  return "Photo";
}
