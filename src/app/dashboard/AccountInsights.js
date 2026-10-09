"use client";

import { useEffect, useState } from "react";
import BarChart from "./BarChart";
import FollowersGrowth from "./FollowersGrowth";

// Last 30 days of account-level insights, fetched live from Meta.
export default function AccountInsights({ accountId }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/account-insights?account=${encodeURIComponent(accountId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (failed) {
    return (
      <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 text-sm text-[#ed4956] sm:mx-0">
        Could not load account insights. Log in again if this persists.
      </section>
    );
  }
  if (!data) {
    return (
      <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 text-sm text-[#8e8e8e] sm:mx-0">
        Loading account insights…
      </section>
    );
  }

  const days = data.days ?? [];
  const maxReach = Math.max(1, ...days.map((d) => d.reach ?? 0));
  const reachTotal = days.reduce((sum, d) => sum + (d.reach ?? 0), 0);
  const followersNet = days.reduce((sum, d) => sum + (d.follower_count ?? 0), 0);

  return (
    <>
    <section className="mx-4 mb-6 rounded-lg border border-[#dbdbdb] p-4 sm:mx-0">
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <Stat label="Last 30 days · Reach" value={reachTotal} />
        <Stat label="Views" value={data.views} />
        <Stat label="Followers (net)" value={followersNet} signed />
      </div>

      {days.length === 0 ? (
        <p className="text-sm text-[#8e8e8e]">No daily data returned by Meta for this window.</p>
      ) : (
        <>
          <BarChart
            data={days.map((d) => ({ label: d.date, short: d.date.slice(5), value: d.reach }))}
            yLabel="Reach"
            xLabel="Date"
            color="#c13584"
          />

          <details className="mt-4" open>
            <summary className="cursor-pointer text-xs font-semibold text-[#262626]">
              Day by day
            </summary>
            <div className="mt-3 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#8e8e8e]">
                    <th className="py-1 font-normal">Date</th>
                    <th className="py-1 text-right font-normal">Reach</th>
                    <th className="py-1 text-right font-normal">Followers (net)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((d) => (
                    <tr key={d.date} className="border-t border-[#efefef]">
                      <td className="py-1.5">{d.date}</td>
                      <td className="py-1.5 text-right">{format(d.reach)}</td>
                      <td className="py-1.5 text-right">{signedFormat(d.follower_count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      {data.error && (
        <p className="mt-3 text-xs text-[#ed4956]">Meta returned: {data.error}</p>
      )}
    </section>
    <FollowersGrowth points={followerSeries(days, data.followers)} periodLabel="Last 30 days" />
    </>
  );
}

// Follower total per day. Starts from today's count and walks back by Meta's daily net change.
function followerSeries(days, current) {
  if (current === null || current === undefined || days.length === 0) return [];
  const series = [];
  let total = current;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    series.unshift({ date: days[i].date, followers: total });
    total -= days[i].follower_count ?? 0;
  }
  return series;
}

function Stat({ label, value, signed }) {
  return (
    <div>
      <p className="text-xs text-[#8e8e8e]">{label}</p>
      <p className="text-lg font-semibold text-[#262626]">
        {signed ? signedFormat(value) : format(value)}
      </p>
    </div>
  );
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}

function signedFormat(value) {
  if (value === null || value === undefined) return "–";
  return `${value > 0 ? "+" : ""}${Number(value).toLocaleString()}`;
}
