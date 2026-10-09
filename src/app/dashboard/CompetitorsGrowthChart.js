"use client";

import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "#f59e0b", "#10b981", "#ef4444", "#6366f1"];

// Follower change in % since the start of the 30 days, one line per account. series: [{ key, label, points: [{ date, pct }] }]
export default function CompetitorsGrowthChart({ series }) {
  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const rows = dates.map((date) => {
    const row = { date };
    for (const s of series) {
      const point = s.points.find((p) => p.date === date);
      row[s.key] = point ? Math.round(point.pct * 100) / 100 : null;
    }
    return row;
  });
  const config = Object.fromEntries(series.map((s, i) => [s.key, { label: s.label, color: COLORS[i % COLORS.length] }]));

  return (
    <ChartContainer config={config} className="h-72 w-full">
      <RechartsLineChart data={rows} margin={{ top: 12, right: 12, left: 4, bottom: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
        <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${v}%`} />
        <Tooltip content={<ChartTooltipContent />} />
        <Legend />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </RechartsLineChart>
    </ChartContainer>
  );
}
