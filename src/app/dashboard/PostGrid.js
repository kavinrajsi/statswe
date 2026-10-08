"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import BarChart from "./BarChart";

// Grid of post tiles. Clicking a tile opens the insights drawer from the right.
export default function PostGrid({ posts }) {
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);

  function openPost(post) {
    setSelected(post);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    // Keep the post mounted until the slide-out finishes
    setTimeout(() => setSelected(null), 300);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <ul className="grid grid-cols-3 gap-[3px] sm:gap-7">
        {posts.map((post) => (
          <PostTile key={post.ig_id} post={post} onOpen={() => openPost(post)} />
        ))}
      </ul>

      {selected && (
        <InsightsDrawer key={selected.ig_id} post={selected} open={open} onClose={close} />
      )}
    </>
  );
}

function PostTile({ post, onOpen }) {
  const image =
    post.thumbnail_url ?? post.media_url ?? post.children?.find((c) => c.media_url)?.media_url;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group relative block aspect-square w-full overflow-hidden bg-[#efefef]"
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

        {post.media_type === "CAROUSEL_ALBUM" && (
          <span className="absolute top-2 right-2 text-white drop-shadow">
            <CarouselIcon />
          </span>
        )}
        {post.media_type === "VIDEO" && (
          <span className="absolute top-2 right-2 text-white drop-shadow">
            <PlayIcon />
          </span>
        )}

        <span className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/30 text-base font-semibold text-white group-hover:flex">
          <span className="flex items-center gap-1.5">
            <HeartIcon /> {post.like_count ?? 0}
          </span>
          <span className="flex items-center gap-1.5">
            <CommentIcon /> {post.comments_count ?? 0}
          </span>
        </span>
      </button>
    </li>
  );
}

function InsightsDrawer({ post, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/insights?post=${encodeURIComponent(post.ig_id)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [post.ig_id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/post-history?post=${encodeURIComponent(post.ig_id)}`)
      .then((res) => (res.ok ? res.json() : { history: [] }))
      .then((json) => !cancelled && setHistory(json.history ?? []))
      .catch(() => !cancelled && setHistory([]));
    return () => {
      cancelled = true;
    };
  }, [post.ig_id]);

  const m = data?.metrics ?? {};
  const f = data?.followers;
  const views = m.views ?? null;
  const followerViews = f?.FOLLOWER ?? null;
  const nonFollowerViews = f?.NON_FOLLOWER ?? null;
  const followerPct = pct(followerViews, (followerViews ?? 0) + (nonFollowerViews ?? 0));
  const nonFollowerPct = pct(nonFollowerViews, (followerViews ?? 0) + (nonFollowerViews ?? 0));

  return (
    <div className="fixed inset-0 z-50">
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-label="Post insights"
        className={`absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col overflow-y-auto bg-[#000] text-[#f5f5f5] transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#262626] px-5 py-4">
          <h2 className="text-base font-semibold">Post insights</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-[#a8a8a8] hover:text-white"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="flex gap-4 border-b border-[#262626] px-5 py-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-[#262626]">
            {(post.thumbnail_url ?? post.media_url) && (
              <Image
                src={post.thumbnail_url ?? post.media_url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm text-[#a8a8a8]">{post.caption ?? "No caption"}</p>
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-[#0095f6] hover:underline"
            >
              Open on Instagram ↗
            </a>
          </div>
        </div>

        {loading && <p className="px-5 py-8 text-sm text-[#a8a8a8]">Loading insights…</p>}
        {!loading && failed && (
          <p className="px-5 py-8 text-sm text-[#ed4956]">
            Could not load insights. Log in again so the app gets the insights permission.
          </p>
        )}
        {!loading && !failed && data?.error && (
          <p className="px-5 py-4 text-sm text-[#ed4956]">Meta returned: {data.error}</p>
        )}

        {!loading && !failed && data && (
          <div className="px-5">
            <Section title="Views" value={views}>
              <Bar label="Followers" percent={followerPct} />
              <Bar label="Non-followers" percent={nonFollowerPct} />
              {followerViews === null && (
                <p className="py-3 text-xs text-[#a8a8a8]">
                  Followers / non-followers split is not available from Meta for this post.
                </p>
              )}
            </Section>

            <Section title="Interactions" value={m.total_interactions}>
              <Row label="Likes" value={m.likes} />
              <Row label="Comments" value={m.comments} />
              <Row label="Saves" value={m.saved} />
              <Row label="Shares" value={m.shares} />
            </Section>

            <Section title="Reach" value={m.reach}>
              <p className="py-3 text-xs text-[#a8a8a8]">
                &quot;From Home&quot; and &quot;From profile&quot; breakdowns are not available from Meta&apos;s API.
              </p>
            </Section>

            <section className="border-b border-[#262626] py-5">
              <p className="mb-3 text-sm font-semibold">Day by day</p>
              {history === null && <p className="text-xs text-[#a8a8a8]">Loading history…</p>}
              {history !== null && history.length === 0 && (
                <p className="text-xs text-[#a8a8a8]">
                  No daily history yet. Snapshots are taken once a day, so this fills in over time.
                </p>
              )}
              {history !== null && history.length > 0 && (
                <div className="mb-4">
                  <BarChart
                    data={history.map((h) => ({
                      label: h.date,
                      short: h.date.slice(5),
                      value: h.metrics?.reach,
                    }))}
                    yLabel="Reach"
                    xLabel="Date"
                    height={200}
                  />
                </div>
              )}
              {history !== null && history.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[#a8a8a8]">
                        <th className="py-1 pr-2 font-normal">Date</th>
                        <th className="py-1 pr-2 text-right font-normal">Reach</th>
                        <th className="py-1 pr-2 text-right font-normal">Likes</th>
                        <th className="py-1 pr-2 text-right font-normal">Comments</th>
                        <th className="py-1 pr-2 text-right font-normal">Shares</th>
                        <th className="py-1 text-right font-normal">Saves</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...history].reverse().map((row) => (
                        <tr key={row.date} className="border-t border-[#262626]">
                          <td className="py-1.5 pr-2">{row.date}</td>
                          <td className="py-1.5 pr-2 text-right">{format(row.metrics?.reach)}</td>
                          <td className="py-1.5 pr-2 text-right">{format(row.metrics?.likes)}</td>
                          <td className="py-1.5 pr-2 text-right">{format(row.metrics?.comments)}</td>
                          <td className="py-1.5 pr-2 text-right">{format(row.metrics?.shares)}</td>
                          <td className="py-1.5 text-right">{format(row.metrics?.saved)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-2 text-[10px] text-[#a8a8a8]">
                Totals as of each day. Kept for 90 days.
              </p>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ title, value, children }) {
  return (
    <section className="border-b border-[#262626] py-5">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{title}</span>
        <span>{format(value)}</span>
      </div>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm text-[#f5f5f5]">
      <span>{label}</span>
      <span>{format(value)}</span>
    </div>
  );
}

function Bar({ label, percent }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#a8a8a8]">
        <span>{label}</span>
        <span>{percent === null ? "–" : `${percent.toFixed(1)}%`}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-[#262626]">
        <div
          className="h-full bg-[#c13584]"
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function pct(part, total) {
  if (part === null || !total) return null;
  return (part / total) * 100;
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4l14 8-14 8z" />
    </svg>
  );
}

function CarouselIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="7" y="3" width="14" height="14" rx="2" />
      <path d="M3 7v12a2 2 0 0 0 2 2h12" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.2A8 8 0 1 1 21 12z" />
    </svg>
  );
}
