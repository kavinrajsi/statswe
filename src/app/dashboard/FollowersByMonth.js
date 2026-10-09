import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LineChart from "./LineChart";
import { monthLabel } from "./months";

// Follower total at the end of each calendar month, with change from the previous month that has data.
// months: [{ month: "YYYY-MM", followers }], oldest first. followers is null where there is no data.
// showSummary: adds Followers now / Net change / Growth over the months shown (search results).
// note: shown under the summary when there is only one data point.
export default function FollowersByMonth({ months, label = "Followers by month", showSummary = false, note }) {
  const known = months.filter((m) => m.followers !== null);
  if (known.length === 0) return null;

  const rows = [];
  let prev = null;
  for (const m of months) {
    const change = m.followers !== null && prev !== null ? m.followers - prev : null;
    rows.push({ ...m, change });
    if (m.followers !== null) prev = m.followers;
  }

  const first = known[0].followers;
  const now = known[known.length - 1].followers;
  const net = known.length >= 2 ? now - first : null;
  const growth = net !== null && first > 0 ? (net / first) * 100 : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{label}</CardTitle>
        {showSummary && <CardDescription>Follower total at the end of each month</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {showSummary && (
          <>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <Stat label="Followers now" value={now.toLocaleString()} />
              <Stat label="Net change" value={net === null ? "–" : signed(net)} />
              <Stat
                label="Growth"
                value={growth === null ? "–" : `${growth > 0 ? "+" : ""}${growth.toFixed(2)}%`}
              />
            </div>
            {known.length < 2 && note && <p className="text-sm text-muted-foreground">{note}</p>}
          </>
        )}

        {known.length >= 2 && (
          <LineChart
            data={known.map((m) => ({
              label: monthLabel(m.month),
              short: monthLabel(m.month).slice(0, 3),
              value: m.followers,
            }))}
            yLabel="Followers"
            xLabel="Month"
          />
        )}

        <details className="group">
          <summary className="cursor-pointer text-sm font-medium">Month by month</summary>
          <div className="mt-3 max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Followers</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...rows].reverse().map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{monthLabel(r.month)}</TableCell>
                    <TableCell className="text-right">
                      {r.followers === null ? "–" : r.followers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{r.change === null ? "–" : signed(r.change)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </details>
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
