import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LineChart from "./LineChart";

// Follower count over time plus net change for the period.
// points: [{ date: "YYYY-MM-DD", followers }], oldest first. Renders nothing when there are no points.
export default function FollowersGrowth({ points, periodLabel, note, action }) {
  if (points.length === 0) return null;

  const hasGrowth = points.length >= 2;
  const start = points[0].followers;
  const now = points[points.length - 1].followers;
  const net = hasGrowth ? now - start : null;
  const growth = hasGrowth && start > 0 ? (net / start) * 100 : null;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Followers growth</CardTitle>
          <CardDescription>{periodLabel}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <Stat label="Followers now" value={now.toLocaleString()} />
          <Stat label="Net change" value={net === null ? "–" : signed(net)} />
          <Stat
            label="Growth"
            value={growth === null ? "–" : `${growth > 0 ? "+" : ""}${growth.toFixed(2)}%`}
          />
        </div>

        {hasGrowth ? (
          <LineChart
            data={points.map((p) => ({ label: p.date, short: p.date.slice(5), value: p.followers }))}
            yLabel="Followers"
            xLabel="Date"
          />
        ) : (
          <p className="text-sm text-muted-foreground">{note ?? "Not enough history yet."}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function signed(value) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}
