// Line chart in the same style as BarChart. The y-axis is fitted to the data range instead of
// starting at zero, so small day-to-day changes in a large follower count stay visible.
export default function LineChart({ data, yLabel, xLabel, color = "#c13584", height = 200 }) {
  const W = 600;
  const H = height;
  const padL = 68;
  const padR = 12;
  const padT = 12;
  const padB = 52;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const values = data.map((d) => d.value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = Math.max(1, (hi - lo) * 0.1);
  const min = lo - pad;
  const max = hi + pad;

  const yFor = (v) => padT + plotH - ((v - min) / (max - min)) * plotH;
  const xFor = (i) => padL + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const labelEvery = Math.ceil(data.length / 8);
  const ticks = [min, (min + max) / 2, max].map((v) => Math.round(v));

  const line = data.map((d, i) => `${xFor(i)},${yFor(d.value)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel} by ${xLabel}`}>
      {ticks.map((v) => {
        const y = yFor(v);
        return (
          <g key={`tick-${v}`}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#dbdbdb" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#8e8e8e">
              {v.toLocaleString()}
            </text>
          </g>
        );
      })}

      <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="#8e8e8e" strokeWidth="1" />
      <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#8e8e8e" strokeWidth="1" />

      <polyline points={line} fill="none" stroke={color} strokeWidth="2" />

      {data.map((d, i) => (
        <g key={`dot-${i}`}>
          <circle cx={xFor(i)} cy={yFor(d.value)} r="3" fill={color}>
            <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
          </circle>
          {i % labelEvery === 0 && (
            <text x={xFor(i)} y={padT + plotH + 16} textAnchor="middle" fontSize="10" fill="#8e8e8e">
              {d.short ?? d.label}
            </text>
          )}
        </g>
      ))}

      <text
        transform={`translate(14 ${padT + plotH / 2}) rotate(-90)`}
        textAnchor="middle"
        fontSize="11"
        fill="#262626"
      >
        {yLabel}
      </text>
      <text x={padL + plotW / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#262626">
        {xLabel}
      </text>
    </svg>
  );
}
