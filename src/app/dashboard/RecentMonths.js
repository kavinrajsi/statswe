import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { monthLabel, recentMonthKeys } from "./months";

// Posts per month for the current calendar month and the five before it, oldest first.
// Months with no posts show 0. Built from the monthly post counts passed in.
// showReels=false hides the reels line (search results can't tell reels apart).
// coveredFrom: from fetchBusinessDiscoveryMonthly. Shows a note only if it reaches into this window.
export default function RecentMonths({ months, showReels = true, coveredFrom = null }) {
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const keys = recentMonthKeys(6);

  const recent = keys.map((key, i) => {
    const row = byMonth.get(key) ?? { total: 0, reels: 0 };
    return {
      month: key,
      label: monthLabel(key),
      total: row.total,
      reels: row.reels ?? 0,
      current: i === keys.length - 1,
    };
  });
  const total = recent.reduce((sum, m) => sum + m.total, 0);
  const incomplete = coveredFrom !== null && coveredFrom >= keys[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Posts · last 6 months</CardTitle>
        <CardDescription>{total.toLocaleString()} posts in total</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="grid grid-cols-3 gap-3">
          {recent.map((m) => (
            <li key={m.month} className="rounded-lg border bg-muted/40 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                {m.label}
                {m.current && <Badge variant="secondary" className="px-1 py-0 text-[10px]">so far</Badge>}
              </p>
              <p className="mt-1 text-xl font-semibold">{m.total.toLocaleString()}</p>
              {showReels && <p className="text-xs text-muted-foreground">{m.reels.toLocaleString()} reels</p>}
            </li>
          ))}
        </ul>

        {incomplete && (
          <p className="text-xs text-muted-foreground">
            Counts for {monthLabel(coveredFrom)} and earlier may be incomplete: not all posts could be loaded.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
