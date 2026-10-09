"use client";

import { CartesianGrid, Line, LineChart as RechartsLineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Line chart on the shadcn/ui Chart component (Recharts underneath). Same props as before.
// The y-axis is fitted to the data range instead of starting at zero, so small changes stay visible.
// data: [{ label, short?, value }]. short is the x-axis tick text; label is shown in the tooltip.
export default function LineChart({ data, yLabel, xLabel, color = "#c13584", height = 200 }) {
  const config = { value: { label: yLabel, color } };
  const shortByLabel = new Map(data.map((d) => [d.label, d.short ?? d.label]));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(1, (hi - lo) * 0.1);

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsLineChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 24 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval={labelEvery - 1}
          tickFormatter={(v) => shortByLabel.get(v) ?? v}
          label={{ value: xLabel, position: "insideBottom", offset: -12, fontSize: 11 }}
        />
        <YAxis
          domain={[Math.floor(lo - pad), Math.ceil(hi + pad)]}
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => Math.round(v).toLocaleString()}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 11 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Line
          dataKey="value"
          type="monotone"
          stroke="var(--color-value)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-value)" }}
          activeDot={{ r: 5 }}
        />
      </RechartsLineChart>
    </ChartContainer>
  );
}
