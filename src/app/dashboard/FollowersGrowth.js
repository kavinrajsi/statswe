import LineChart from "./LineChart";

// Follower count over time plus net change for the period.
// points: [{ date: "YYYY-MM-DD", followers }], oldest first. Renders nothing when there are no points.
export default function FollowersGrowth({ points, periodLabel, note }) {
  if (points.length === 0) return null;

  const hasGrowth = points.length >= 2;
  const start = points[0].followers;
  const now = points[points.length - 1].followers;
  const net = hasGrowth ? now - start : null;
  const growth = hasGrowth && start > 0 ? (net / start) * 100 : null;

  return (
    <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 sm:mx-0">
      <p className="mb-4 text-xs font-semibold text-[#8e8e8e]">Followers growth · {periodLabel}</p>
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
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
        <p className="text-sm text-[#8e8e8e]">{note ?? "Not enough history yet."}</p>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-xs text-[#8e8e8e]">{label}</p>
      <p className="text-lg font-semibold text-[#262626]">{value}</p>
    </div>
  );
}

function signed(value) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}
