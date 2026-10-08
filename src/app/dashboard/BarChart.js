// Bar chart in the style of a school-chart: y-axis numbers, gridlines, colored bars,
// axis titles. Plain SVG, scales to the container width.
export default function BarChart({ data, yLabel, xLabel, color = "#c13584", height = 240 }) {
  const W = 600;
  const H = height;
  const padL = 68;
  const padR = 12;
  const padT = 12;
  const padB = 52;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const max = Math.max(1, ...data.map((d) => d.value ?? 0));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  const slot = plotW / Math.max(1, data.length);
  const barW = slot * 0.7;
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${yLabel} by ${xLabel}`}>
      {ticks.map((v) => {
        const y = padT + plotH - (v / top) * plotH;
        return (
          <g key={`tick-${v}`}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#dbdbdb" strokeWidth="1" />
            <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#8e8e8e">
              {v}
            </text>
          </g>
        );
      })}

      {/* Y axis */}
      <line x1={padL} x2={padL} y1={padT} y2={padT + plotH} stroke="#8e8e8e" strokeWidth="1" />
      {/* X axis */}
      <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#8e8e8e" strokeWidth="1" />

      {data.map((d, i) => {
        const value = d.value ?? 0;
        const h = (value / top) * plotH;
        const x = padL + i * slot + (slot - barW) / 2;
        const y = padT + plotH - h;
        return (
          <g key={`bar-${i}`}>
            <rect x={x} y={y} width={barW} height={Math.max(h, value > 0 ? 1 : 0)} fill={color}>
              <title>{`${d.label}: ${value.toLocaleString()}`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text
                x={x + barW / 2}
                y={padT + plotH + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#8e8e8e"
              >
                {d.short ?? d.label}
              </text>
            )}
          </g>
        );
      })}

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

// Round the axis step to 1, 2, or 5 times a power of ten
function niceStep(max) {
  const raw = max / 5;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) {
    if (m * magnitude >= raw) return m * magnitude;
  }
  return magnitude * 10;
}
