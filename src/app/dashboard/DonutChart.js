"use client";

import { Cell, Pie, PieChart as RechartsPieChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

// Donut chart with a total and a subtitle in the centre. slices: [{ name, value, color }].
export default function DonutChart({ slices, centerValue, centerLabel, height = 200 }) {
  const total = slices.reduce((sum, s) => sum + (s.value ?? 0), 0);
  // With no data, show an empty ring instead of nothing
  const data =
    total > 0
      ? slices.map((s) => ({ name: s.name, value: s.value ?? 0, fill: s.color }))
      : [{ name: "none", value: 1, fill: "var(--muted)" }];
  const config = Object.fromEntries(slices.map((s) => [s.name, { label: s.name, color: s.color }]));

  return (
    <div className="relative mx-auto" style={{ height, width: height }}>
      <ChartContainer config={config} className="h-full w-full">
        <RechartsPieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="72%"
            outerRadius="100%"
            strokeWidth={0}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.name} fill={d.fill} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-xl font-semibold">{centerValue}</p>
        {centerLabel && <p className="text-xs text-muted-foreground">{centerLabel}</p>}
      </div>
    </div>
  );
}
