"use client";

import { createContext, useContext, useState } from "react";
import Image from "next/image";
import BarChart from "./BarChart";

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
        setResult(json.profile);
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

          {media.length > 0 && (
            <div className="px-4 sm:px-0">
              <PublicInsights profile={result} />
            </div>
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

// Insights we can compute from public data: the last posts and their likes/comments.
function PublicInsights({ profile }) {
  const posts = [...profile.media.data].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const withLikes = posts.filter((p) => typeof p.like_count === "number");
  const avg = (list, key) =>
    list.length === 0 ? null : list.reduce((sum, p) => sum + (p[key] ?? 0), 0) / list.length;

  const avgLikes = avg(withLikes, "like_count");
  const avgComments = avg(posts.filter((p) => typeof p.comments_count === "number"), "comments_count");
  const followers = profile.followers_count ?? 0;
  const engagement =
    followers > 0 && avgLikes !== null ? (((avgLikes ?? 0) + (avgComments ?? 0)) / followers) * 100 : null;

  const spanDays = posts.length > 1
    ? (new Date(posts[posts.length - 1].timestamp) - new Date(posts[0].timestamp)) / 86400000
    : 0;
  const perWeek = spanDays > 0 ? (posts.length / spanDays) * 7 : null;

  const top = withLikes.reduce((best, p) => (!best || p.like_count > best.like_count ? p : best), null);

  const fmt = (n, digits = 0) => (n === null || n === undefined ? "–" : Number(n).toFixed(digits));

  return (
    <div className="mt-4 rounded-lg border border-[#dbdbdb] p-4">
      <p className="mb-3 text-xs font-semibold text-[#8e8e8e]">Public insights · last {posts.length} posts</p>
      <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        <Metric
          label="Engagement rate"
          value={engagement === null ? "–" : `${fmt(engagement, 2)}%`}
          formula="(avg likes + avg comments) ÷ followers × 100"
        />
        <Metric
          label="Avg likes"
          value={fmt(avgLikes)}
          formula="sum of likes ÷ number of posts"
        />
        <Metric
          label="Avg comments"
          value={fmt(avgComments)}
          formula="sum of comments ÷ number of posts"
        />
        <Metric
          label="Posts / week"
          value={fmt(perWeek, 1)}
          formula="posts ÷ (days from oldest to newest post ÷ 7)"
        />
      </div>
      {withLikes.length > 0 && (
        <>
          <p className="mb-1 text-xs text-[#8e8e8e]">Likes per post</p>
          <BarChart
            data={posts.map((p) => ({
              label: new Date(p.timestamp).toISOString().slice(0, 10),
              short: new Date(p.timestamp).toISOString().slice(5, 10),
              value: p.like_count ?? 0,
            }))}
            yLabel="Likes"
            xLabel="Post date"
            color="#c13584"
            height={180}
          />
        </>
      )}
      <details className="mt-4" open>
        <summary className="cursor-pointer text-xs font-semibold text-[#262626]">Date by date</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#8e8e8e]">
                <th className="py-1 font-normal">Date</th>
                <th className="py-1 text-right font-normal">Likes</th>
                <th className="py-1 text-right font-normal">Comments</th>
                <th className="py-1 text-right font-normal">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {[...posts].reverse().map((p) => {
                const likes = p.like_count ?? null;
                const comments = p.comments_count ?? null;
                const total = likes === null && comments === null ? null : (likes ?? 0) + (comments ?? 0);
                return (
                  <tr key={p.id} className="border-t border-[#efefef]">
                    <td className="py-1.5">
                      <a href={p.permalink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {new Date(p.timestamp).toISOString().slice(0, 10)}
                      </a>
                    </td>
                    <td className="py-1.5 text-right">{fmt(likes)}</td>
                    <td className="py-1.5 text-right">{fmt(comments)}</td>
                    <td className="py-1.5 text-right">{fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>

      {top && (
        <p className="mt-3 text-xs text-[#8e8e8e]">
          Top post: {top.like_count.toLocaleString()} likes ·{" "}
          <a href={top.permalink} target="_blank" rel="noopener noreferrer" className="text-[#0095f6] hover:underline">
            open
          </a>
        </p>
      )}
    </div>
  );
}

function Metric({ label, value, formula }) {
  return (
    <div>
      <p className="text-xs text-[#8e8e8e]">{label}</p>
      <p className="text-lg font-semibold text-[#262626]">{value}</p>
      {formula && <p className="mt-0.5 max-w-[200px] text-[10px] leading-snug text-[#8e8e8e]">{formula}</p>}
    </div>
  );
}
