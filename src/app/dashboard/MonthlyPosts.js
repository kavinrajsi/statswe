import BarChart from "./BarChart";

// Own posts per calendar month, from synced ig_posts. Server-rendered; no client JS needed.
export default function MonthlyPosts({ months }) {
  if (months.length === 0) {
    return (
      <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 text-sm text-[#8e8e8e] sm:mx-0">
        No synced posts yet.
      </section>
    );
  }

  const filled = fillGaps(months).map((m) => ({ ...m, label: monthLabel(m.month) }));
  const total = filled.reduce((sum, m) => sum + m.total, 0);

  return (
    <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 sm:mx-0">
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-[#8e8e8e]">Total posts</p>
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
                <th className="py-1 text-right font-normal">Feed</th>
                <th className="py-1 text-right font-normal">Reels</th>
              </tr>
            </thead>
            <tbody>
              {[...filled].reverse().map((m) => (
                <tr key={m.month} className="border-t border-[#efefef]">
                  <td className="py-1.5">{m.label}</td>
                  <td className="py-1.5 text-right">{m.total.toLocaleString()}</td>
                  <td className="py-1.5 text-right">{(m.total - m.reels).toLocaleString()}</td>
                  <td className="py-1.5 text-right">{m.reels.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
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

function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  const name = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${name} ${year}`;
}
