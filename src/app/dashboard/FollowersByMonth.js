import LineChart from "./LineChart";
import { monthLabel } from "./months";

// Follower total at the end of each calendar month, with change from the previous month that has data.
// months: [{ month: "YYYY-MM", followers }], oldest first. followers is null where there is no data.
export default function FollowersByMonth({ months, label = "Followers by month" }) {
  const known = months.filter((m) => m.followers !== null);
  if (known.length === 0) return null;

  const rows = [];
  let prev = null;
  for (const m of months) {
    const change = m.followers !== null && prev !== null ? m.followers - prev : null;
    rows.push({ ...m, change });
    if (m.followers !== null) prev = m.followers;
  }

  return (
    <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 sm:mx-0">
      <p className="mb-4 text-xs font-semibold text-[#8e8e8e]">{label}</p>

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

function signed(value) {
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}
