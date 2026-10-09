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
    <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 sm:mx-0">
      <p className="mb-4 text-xs font-semibold text-[#8e8e8e]">{label}</p>

      {showSummary && (
        <>
          <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Stat label="Followers now" value={now.toLocaleString()} />
            <Stat label="Net change" value={net === null ? "–" : signed(net)} />
            <Stat
              label="Growth"
              value={growth === null ? "–" : `${growth > 0 ? "+" : ""}${growth.toFixed(2)}%`}
            />
          </div>
          {known.length < 2 && note && <p className="mb-4 text-sm text-[#8e8e8e]">{note}</p>}
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

      <details className="mt-4" open>
        <summary className="cursor-pointer text-xs font-semibold text-[#262626]">Month by month</summary>
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8e8e8e]">
                <th className="py-1 font-normal">Month</th>
                <th className="py-1 text-right font-normal">Followers</th>
                <th className="py-1 text-right font-normal">Change</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={r.month} className="border-t border-[#efefef]">
                  <td className="py-1.5">{monthLabel(r.month)}</td>
                  <td className="py-1.5 text-right">{r.followers === null ? "–" : r.followers.toLocaleString()}</td>
                  <td className="py-1.5 text-right">{r.change === null ? "–" : signed(r.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
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
