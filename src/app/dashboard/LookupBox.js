"use client";

import { createContext, useContext, useState } from "react";
import Image from "next/image";
import { ArrowLeft, Download, Search } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import RecentMonths from "./RecentMonths";
import FollowersByMonth from "./FollowersByMonth";
import { ProfileCard } from "./ProfileCard";
import { monthEnds } from "./months";

const LookupContext = createContext(null);

// Holds the lookup result so the search form (app bar) and results (page body) can live apart.
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

// Search box, shown in the app bar.
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
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Look up an Instagram username"
        className="h-9"
      />
      <Button type="submit" size="sm" disabled={loading}>
        <Search className="h-4 w-4" />
        {loading ? "Searching…" : "Search"}
      </Button>
    </form>
  );
}

// Hides the dashboard while a lookup is shown or loading, so only one set of data is on screen.
export function LookupGate({ children }) {
  const { result, status, loading } = useLookup();
  if (loading || result || status) return null;
  return children;
}

// Saved competitors as one-click chips. Each runs the username search.
export function CompetitorChips({ competitors }) {
  const { search, loading } = useLookup();
  if (competitors.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Competitors</span>
      {competitors.map((c) => (
        <Button
          key={c.username}
          variant="outline"
          size="sm"
          className="h-7 rounded-full px-3 text-xs"
          disabled={loading}
          onClick={() => search(c.username)}
        >
          @{c.username}
        </Button>
      ))}
    </div>
  );
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

// Search results, shown in place of the dashboard. Same sections as the own-account view where Meta allows.
export function LookupResults() {
  const { result, status, loading, clear } = useLookup();
  if (!result && !status && !loading) return null;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={clear}>
          <ArrowLeft className="h-4 w-4" />
          Back to my dashboard
        </Button>
        {result && (
          <Button variant="outline" size="sm" onClick={() => downloadCsv(result)}>
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-6">
          <Skeleton className="h-36" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      )}

      {status && (
        <Alert variant="destructive">
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          <ProfileCard
            username={result.username}
            name={result.name}
            biography={result.biography}
            pictureUrl={result.profile_picture_url}
            posts={result.media_count}
            followers={result.followers_count}
            following={result.follows_count}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <FollowersByMonth
              months={monthEnds(result.followerHistory, 12)}
              label="Followers · tracked since first search"
              showSummary
              note="Tracking started today. Growth appears after the next daily snapshot."
            />
            {result.monthly && (
              <RecentMonths
                months={result.monthly.months}
                showReels={false}
                coveredFrom={result.monthly.coveredFrom}
              />
            )}
          </div>

          <PublicPosts media={result.media?.data ?? []} />
        </>
      )}
    </section>
  );
}

// Latest public posts, linked to Instagram.
function PublicPosts({ media }) {
  if (media.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No public posts found.</p>;
  }
  return (
    <ul className="grid grid-cols-3 gap-1 sm:gap-4">
      {media.map((post) => {
        const image = post.thumbnail_url ?? post.media_url;
        return (
          <li key={post.id}>
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block aspect-square overflow-hidden rounded-md bg-muted"
            >
              {image && (
                <Image
                  src={image}
                  alt={post.caption?.slice(0, 100) ?? "Instagram post"}
                  fill
                  sizes="(min-width: 640px) 293px, 33vw"
                  className="object-cover"
                />
              )}
              <span className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/40 text-base font-semibold text-white group-hover:flex">
                <span>♥ {post.like_count ?? 0}</span>
                <span>💬 {post.comments_count ?? 0}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
