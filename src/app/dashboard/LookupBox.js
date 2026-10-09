"use client";

import { createContext, useContext, useState } from "react";
import Image from "next/image";
import RecentMonths from "./RecentMonths";
import MonthlyPosts from "./MonthlyPosts";
import FollowersGrowth from "./FollowersGrowth";
import FollowersByMonth from "./FollowersByMonth";
import { monthEnds } from "./months";

const LookupContext = createContext(null);

// Holds the lookup result so the search form (top) and results (bottom) can live apart.
export function LookupProvider({ children }) {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function search(raw) {
    const username = raw.trim().replace(/^@/, "");
    if (!username) return;
    setLoading(true);
    setStatus(null);
    setResult(null);
    try {
      const res = await fetch(`/api/instagram/lookup?username=${encodeURIComponent(username)}`);
      const json = await res.json();
      if (!res.ok) {
        setStatus(
          json.error === "not_found"
            ? "No public Business or Creator account with that username."
            : `Lookup failed (${json.error ?? res.status}).`
        );
      } else {
        // No history yet on the first search: show today's count alone, so the card shows the "tracking started" note
        const history = json.followerHistory ?? [];
        const followers = json.profile?.followers_count;
        const followerHistory =
          history.length === 0 && followers != null
            ? [{ date: new Date().toISOString().slice(0, 10), followers }]
            : history;
        setResult({ ...json.profile, monthly: json.monthly, followerHistory });
      }
    } catch {
      setStatus("Lookup failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setResult(null);
    setStatus(null);
  }

  return (
    <LookupContext.Provider value={{ result, status, loading, search, clear }}>
      {children}
    </LookupContext.Provider>
  );
}

function useLookup() {
  const ctx = useContext(LookupContext);
  if (!ctx) throw new Error("Lookup components must be rendered inside LookupProvider");
  return ctx;
}

// Search box, shown at the top of the dashboard.
export function LookupForm() {
  const { search, loading } = useLookup();
  const [query, setQuery] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        search(query);
      }}
      className="flex gap-2"
    >
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Look up an Instagram username"
        className="min-w-0 flex-1 rounded-lg border border-[#dbdbdb] px-3 py-2 text-sm outline-none focus:border-[#8e8e8e]"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-[#262626] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}

// Hides the dashboard while a lookup is shown or loading, so only one set of data is on screen.
export function LookupGate({ children }) {
  const { result, status, loading } = useLookup();
  if (loading || result || status) return null;
  return children;
}

// Builds a CSV in the browser and downloads it. Nothing is sent to or stored by the server.
function downloadCsv(profile) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["username", "followers", "following", "posts"],
    [profile.username, profile.followers_count, profile.follows_count, profile.media_count],
    [],
    ["date", "type", "likes", "comments", "permalink"],
    ...(profile.media?.data ?? []).map((p) => [
      new Date(p.timestamp).toISOString().slice(0, 10),
      p.media_type,
      p.like_count,
      p.comments_count,
      p.permalink,
    ]),
  ];
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${profile.username}-lookup.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Result card, shown under the search box. Same layout as the dashboard profile.
export function LookupResults() {
  const { result, status, clear } = useLookup();
  if (!result && !status) return null;

  const media = result?.media?.data ?? [];
  const stats = result
    ? [
        ["posts", result.media_count],
        ["followers", result.followers_count],
        ["following", result.follows_count],
      ]
    : [];

  return (
    <section className="mx-auto max-w-[935px] font-sans text-[#262626]">
      <div className="flex flex-wrap justify-end gap-2 px-4 pt-6 sm:px-0">
        {result && (
          <button
            type="button"
            onClick={() => downloadCsv(result)}
            className="rounded-lg bg-[#efefef] px-4 py-1.5 text-sm font-semibold hover:bg-[#dbdbdb]"
          >
            Download CSV
          </button>
        )}
        <button
          type="button"
          onClick={clear}
          className="rounded-lg bg-[#efefef] px-4 py-1.5 text-sm font-semibold hover:bg-[#dbdbdb]"
        >
          Back to my dashboard
        </button>
      </div>

      {status && <p className="px-4 py-10 text-center text-sm text-[#ed4956] sm:px-0">{status}</p>}

      {result && (
        <>
          <header className="flex items-start gap-6 px-4 pt-8 pb-6 sm:gap-20 sm:px-0 sm:pt-14 sm:pb-11">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#efefef] sm:h-[150px] sm:w-[150px]">
              {result.profile_picture_url && (
                <Image src={result.profile_picture_url} alt={`@${result.username}`} fill sizes="150px" className="object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-normal">{result.username}</h1>
              <ul className="mt-5 hidden gap-10 text-base sm:flex">
                {stats.map(([label, value]) => (
                  <ProfileStat key={label} label={label} value={value} />
                ))}
              </ul>
              {result.name && <p className="mt-5 text-sm font-semibold">{result.name}</p>}
              {result.biography && <p className="mt-2 whitespace-pre-line text-sm">{result.biography}</p>}
            </div>
          </header>

          <ul className="flex justify-around border-t border-[#dbdbdb] py-3 text-sm sm:hidden">
            {stats.map(([label, value]) => (
              <ProfileStat key={label} label={label} value={value} />
            ))}
          </ul>

          <FollowersGrowth
            points={result.followerHistory}
            periodLabel="Tracked since first search"
            note="Tracking started today. Growth appears after the next daily snapshot."
          />
          <FollowersByMonth months={monthEnds(result.followerHistory, 12)} />

          {result.monthly && (
            <>
              <RecentMonths
                months={result.monthly.months}
                showReels={false}
                coveredFrom={result.monthly.coveredFrom}
              />
              <MonthlyPosts
                months={result.monthly.months}
                label="Posts · last 12 months"
                showReels={false}
                windowMonths={12}
                coveredFrom={result.monthly.coveredFrom}
                emptyText="No posts found."
              />
            </>
          )}

          <div className="flex justify-center border-t border-[#dbdbdb]">
            <div className="-mt-px flex items-center gap-2 border-t border-[#262626] px-2 py-3 text-xs font-semibold tracking-[0.12em]">
              POSTS
            </div>
          </div>

          {media.length > 0 ? (
            <ul className="grid grid-cols-3 gap-[3px] sm:gap-7">
              {media.map((post) => {
                const image = post.thumbnail_url ?? post.media_url;
                return (
                  <li key={post.id}>
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative block aspect-square overflow-hidden bg-[#efefef]"
                    >
                      {image && (
                        <Image src={image} alt={post.caption?.slice(0, 100) ?? "Instagram post"} fill sizes="(min-width: 640px) 293px, 33vw" className="object-cover" />
                      )}
                      <span className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/30 text-base font-semibold text-white group-hover:flex">
                        <span>♥ {post.like_count ?? 0}</span>
                        <span>💬 {post.comments_count ?? 0}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-16 text-center text-sm text-[#8e8e8e]">No public posts found.</p>
          )}
        </>
      )}
    </section>
  );
}

function ProfileStat({ label, value }) {
  return (
    <li className="text-center sm:text-left">
      <span className="font-semibold">{value ?? "–"}</span> <span>{label}</span>
    </li>
  );
}
