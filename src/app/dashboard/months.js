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

export function monthLabel(key) {
  const [year, month] = key.split("-").map(Number);
  const name = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${name} ${year}`;
}
