import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { monthLabel } from "./months";

// Followers at month end, unique reach and profile visits per calendar month, newest first.
// rows: [{ month: "YYYY-MM", followers, reach, profileViews }], oldest first. Null values show as "–".
export default function MonthlyMetrics({ rows }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Month by month</CardTitle>
        <CardDescription>Followers at month end, unique reach and profile visits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-80 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Followers</TableHead>
                <TableHead className="text-right">Reach</TableHead>
                <TableHead className="text-right">Profile visits</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...rows].reverse().map((r) => (
                <TableRow key={r.month}>
                  <TableCell>{monthLabel(r.month)}</TableCell>
                  <TableCell className="text-right">{format(r.followers)}</TableCell>
                  <TableCell className="text-right">{format(r.reach)}</TableCell>
                  <TableCell className="text-right">{format(r.profileViews)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          Meta keeps only recent history, so older months may show &quot;–&quot;. The current month is still filling in.
        </p>
      </CardContent>
    </Card>
  );
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}
