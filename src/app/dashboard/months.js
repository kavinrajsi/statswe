// Shared helpers for the monthly post sections. Months are UTC, keyed as "YYYY-MM".

export function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Keys for the current calendar month and the (count - 1) before it, oldest first.
export function recentMonthKeys(count) {
  const now = new Date();
  const keys = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    keys.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))));
  }
  return keys;
}

// Last value of each month over the last `count` calendar months, oldest first. Months without data are null.
// points: [{ date: "YYYY-MM-DD", followers }], oldest first.
export function monthEnds(points, count) {
  const last = new Map();
  for (const p of points) last.set(p.date.slice(0, 7), p.followers);
  return recentMonthKeys(count).map((month) => ({ month, followers: last.get(month) ?? null }));
}

export function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  const name = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${name} ${year}`;
}
