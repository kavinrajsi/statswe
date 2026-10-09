import { monthLabel, recentMonthKeys } from "./months";

// Posts per month for the current calendar month and the five before it, oldest first.
// Months with no posts show 0. Built from the monthly post counts passed in.
// showReels=false hides the reels line (search results can't tell reels apart).
// coveredFrom: from fetchBusinessDiscoveryMonthly. Shows a note only if it reaches into this window.
export default function RecentMonths({ months, showReels = true, coveredFrom = null }) {
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const keys = recentMonthKeys(6);

  const recent = keys.map((key, i) => {
    const row = byMonth.get(key) ?? { total: 0, reels: 0 };
    return {
      month: key,
      label: monthLabel(key),
      total: row.total,
      reels: row.reels ?? 0,
      current: i === keys.length - 1,
    };
  });
  const total = recent.reduce((sum, m) => sum + m.total, 0);
  const incomplete = coveredFrom !== null && coveredFrom >= keys[0];

  return (
    <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 sm:mx-0">
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <div>
          <p className="text-xs text-[#8e8e8e]">Last 6 months · Total posts</p>
          <p className="text-lg font-semibold text-[#262626]">{total.toLocaleString()}</p>
        </div>
      </div>

      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {recent.map((m) => (
          <li key={m.month} className="rounded-lg bg-[#fafafa] p-3 text-center">
            <p className="text-xs text-[#8e8e8e]">
              {m.label}
              {m.current && " · so far"}
            </p>
            <p className="mt-1 text-xl font-semibold text-[#262626]">{m.total.toLocaleString()}</p>
            {showReels && <p className="text-xs text-[#8e8e8e]">{m.reels.toLocaleString()} reels</p>}
          </li>
        ))}
      </ul>

      {incomplete && (
        <p className="mt-3 text-xs text-[#8e8e8e]">
          Counts for {monthLabel(coveredFrom)} and earlier may be incomplete: not all posts could be loaded.
        </p>
      )}
    </section>
  );
}
