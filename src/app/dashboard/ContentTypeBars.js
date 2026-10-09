"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TYPES = [
  ["reels", "Reels"],
  ["posts", "Posts"],
  ["stories", "Stories"],
  ["ads", "Ads"],
];

// Share of views (or interactions) by content type. byType: { all, followers?, nonFollowers? } of counts.
// With follower data the chips switch between all / followers / non-followers, and "all" bars are stacked.
export default function ContentTypeBars({ byType }) {
  const [filter, setFilter] = useState("all");
  const split = Boolean(byType?.followers && byType?.nonFollowers);
  if (!byType?.all) return <p className="text-sm text-muted-foreground">No data for this period.</p>;

  const set = split && filter !== "all" ? byType[filter === "followers" ? "followers" : "nonFollowers"] : byType.all;
  const sum = TYPES.reduce((s, [k]) => s + (set[k] ?? 0), 0);
  const allSum = TYPES.reduce((s, [k]) => s + (byType.all[k] ?? 0), 0);
  const rows = TYPES.filter(([k]) => (set[k] ?? 0) > 0);

  return (
    <div className="space-y-4">
      {split && (
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="nonFollowers">Non-followers</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {rows.length === 0 && <p className="text-sm text-muted-foreground">No data for this period.</p>}

      <div className="space-y-3">
        {rows.map(([key, label]) => {
          const value = set[key] ?? 0;
          const share = sum > 0 ? (value / sum) * 100 : 0;
          const all = byType.all[key] ?? 0;
          // Stacked "all" bar: pink for followers, purple for non-followers, within this type's share
          const followerPart = split && filter === "all" && all > 0 ? (byType.followers[key] ?? 0) / all : null;
          const width = filter === "all" || !split ? (allSum > 0 ? (all / allSum) * 100 : 0) : share;
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span>{label}</span>
                <span className="text-muted-foreground">{share.toFixed(1)}%</span>
              </div>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                {followerPart === null ? (
                  <div className="h-full bg-[var(--chart-2)]" style={{ width: `${width}%` }} />
                ) : (
                  <>
                    <div className="h-full bg-[var(--chart-1)]" style={{ width: `${width * followerPart}%` }} />
                    <div className="h-full bg-[var(--chart-2)]" style={{ width: `${width * (1 - followerPart)}%` }} />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
