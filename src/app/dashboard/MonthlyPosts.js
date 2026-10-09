import BarChart from "./BarChart";
import { monthLabel, recentMonthKeys } from "./months";

// Posts per calendar month. Server-rendered; no client JS needed.
// windowMonths: show exactly that many months ending now (search results). Default: full history from the first post (dashboard).
// coveredFrom: from fetchBusinessDiscoveryMonthly. That month and earlier may be incomplete, so a note is shown.
// showReels=false drops the Feed/Reels columns (search results can't tell reels apart).
export default function MonthlyPosts({
  months,
  label = "Total posts",
  showReels = true,
  windowMonths = null,
  coveredFrom = null,
  emptyText = "No synced posts yet.",
}) {
  if (months.length === 0) {
    return (
      <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 text-sm text-[#8e8e8e] sm:mx-0">
        {emptyText}
      </section>
    );
  }

  const filled = (windowMonths ? windowRows(months, windowMonths) : fillGaps(months)).map((m) => ({
    ...m,
    label: monthLabel(m.month),
  }));
  const total = filled.reduce((sum, m) => sum + m.total, 0);
  const incomplete = coveredFrom !== null && filled.some((m) => m.month <= coveredFrom);

  return (
    <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 sm:mx-0">
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-[#8e8e8e]">{label}</p>
          <p className="text-lg font-semibold text-[#262626]">{total.toLocaleString()}</p>
        </div>
      </div>

      <BarChart
        data={filled.map((m) => ({ label: m.label, short: m.label.slice(0, 3), value: m.total }))}
        yLabel="Posts"
        xLabel="Month"
        color="#c13584"
      />

      <details className="mt-4">
        <summary className="cursor-pointer text-xs font-semibold text-[#262626]">Month by month</summary>
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8e8e8e]">
                <th className="py-1 font-normal">Month</th>
                <th className="py-1 text-right font-normal">Posts</th>
                {showReels && <th className="py-1 text-right font-normal">Feed</th>}
                {showReels && <th className="py-1 text-right font-normal">Reels</th>}
              </tr>
            </thead>
            <tbody>
              {[...filled].reverse().map((m) => (
                <tr key={m.month} className="border-t border-[#efefef]">
                  <td className="py-1.5">{m.label}</td>
                  <td className="py-1.5 text-right">{m.total.toLocaleString()}</td>
                  {showReels && <td className="py-1.5 text-right">{(m.total - m.reels).toLocaleString()}</td>}
                  {showReels && <td className="py-1.5 text-right">{m.reels.toLocaleString()}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {incomplete && (
        <p className="mt-3 text-xs text-[#8e8e8e]">
          Counts for {monthLabel(coveredFrom)} and earlier may be incomplete: not all posts could be loaded.
        </p>
      )}
    </section>
  );
}

// Window of exactly `count` months ending now. Months without posts are zeros.
function windowRows(rows, count) {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return recentMonthKeys(count).map((key) => byMonth.get(key) ?? { month: key, total: 0, reels: 0 });
}

// Months with no posts are missing from the query result; insert them as zeros so the x-axis is continuous.
function fillGaps(rows) {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const [startYear, startMonth] = rows[0].month.split("-").map(Number);
  const [endYear, endMonth] = rows[rows.length - 1].month.split("-").map(Number);

  const out = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    out.push(byMonth.get(key) ?? { month: key, total: 0, reels: 0 });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}
