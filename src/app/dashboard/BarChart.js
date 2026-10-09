"use client";

import { Bar, BarChart as RechartsBarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Bar chart on the shadcn/ui Chart component (Recharts underneath). Same props as before.
// data: [{ label, short?, value }]. short is the x-axis tick text; label is shown in the tooltip.
export default function BarChart({ data, yLabel, xLabel, color = "#c13584", height = 240 }) {
  const config = { value: { label: yLabel, color } };
  const shortByLabel = new Map(data.map((d) => [d.label, d.short ?? d.label]));
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <ChartContainer config={config} className="w-full" style={{ height }}>
      <RechartsBarChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 24 }}>
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
          tickLine={false}
          axisLine={false}
          width={56}
          label={{ value: yLabel, angle: -90, position: "insideLeft", fontSize: 11 }}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} />
      </RechartsBarChart>
    </ChartContainer>
  );
}
