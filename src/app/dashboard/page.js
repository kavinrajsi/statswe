import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import PostGrid from "./PostGrid";
import AccountInsights from "./AccountInsights";
import MonthlyPosts from "./MonthlyPosts";
import { LookupForm, LookupGate, LookupProvider, LookupResults } from "./LookupBox";

export default function Dashboard({ searchParams }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-[#8e8e8e]">Loading…</p>}>
      <DashboardContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DashboardContent({ searchParams }) {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/");

  const accounts = await sql`
    select id, username, name, profile_picture_url, followers_count, follows_count,
           media_count, last_synced_at
    from ig_accounts
    where fb_user_id = ${session.userId}
    order by username
  `;

  if (accounts.length === 0) {
    return (
      <Shell>
        <div className="py-20 text-center">
          <h1 className="mb-2 text-xl font-semibold">No Instagram account found</h1>
          <p className="mx-auto max-w-sm text-sm text-[#8e8e8e]">
            Your Facebook login worked, but none of your Pages has an Instagram Business or
            Creator account linked. Link one, then log in again.
          </p>
          <LogoutButton />
        </div>
      </Shell>
    );
  }

  const { account: accountParam, tab: tabParam } = await searchParams;
  const active = accounts.find((a) => a.id === accountParam) ?? accounts[0];
  const tab = TABS.find((t) => t.key === tabParam)?.key ?? "posts";
  const [posts, months] = await Promise.all([
    fetchPosts(active.id, tab),
    fetchMonthlyCounts(active.id),
  ]);

  return (
    <LookupProvider>
    <Shell>
      <div className="px-4 pt-6 sm:px-0">
        <LookupForm />
      </div>
      <LookupResults />

      <LookupGate>
      {/* Profile header */}
      <header className="flex items-start gap-6 px-4 pt-8 pb-6 sm:gap-20 sm:px-0 sm:pt-14 sm:pb-11">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-[#efefef] sm:h-[150px] sm:w-[150px]">
          {active.profile_picture_url && (
            <Image
              src={active.profile_picture_url}
              alt={`@${active.username}`}
              fill
              sizes="150px"
              className="object-cover"
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-xl font-normal">{active.username}</h1>
            <LogoutButton />
          </div>

          <ul className="mt-5 hidden gap-10 text-base sm:flex">
            <Stat value={active.media_count ?? posts.length} label="posts" />
            <Stat value={active.followers_count} label="followers" />
            <Stat value={active.follows_count} label="following" />
          </ul>

          {active.name && <p className="mt-5 text-sm font-semibold">{active.name}</p>}
        </div>
      </header>

      {/* Mobile stats row */}
      <ul className="flex justify-around border-t border-[#dbdbdb] py-3 text-sm sm:hidden">
        <Stat value={active.media_count ?? posts.length} label="posts" />
        <Stat value={active.followers_count} label="followers" />
        <Stat value={active.follows_count} label="following" />
      </ul>

      {accounts.length > 1 && (
        <nav className="flex flex-wrap gap-2 px-4 pb-4 sm:px-0">
          {accounts.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard?account=${a.id}&tab=${tab}`}
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                a.id === active.id
                  ? "bg-[#262626] text-white"
                  : "bg-[#efefef] text-[#262626]"
              }`}
            >
              @{a.username}
            </Link>
          ))}
        </nav>
      )}

      <AccountInsights key={active.id} accountId={active.id} />

      <MonthlyPosts months={months} />

      {/* Tab bar */}
      <nav className="flex justify-center gap-12 border-t border-[#dbdbdb]">
        {TABS.map(({ key, label, Icon }) => (
          <Link
            key={key}
            href={`/dashboard?account=${active.id}&tab=${key}`}
            className={`-mt-px flex items-center gap-2 border-t px-2 py-3 text-xs font-semibold tracking-[0.12em] ${
              key === tab ? "border-[#262626] text-[#262626]" : "border-transparent text-[#8e8e8e]"
            }`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>

      {posts.length === 0 ? (
        <p className="py-16 text-center text-sm text-[#8e8e8e]">{EMPTY[tab]}</p>
      ) : (
        <PostGrid posts={posts} />
      )}
      </LookupGate>
    </Shell>
    </LookupProvider>
  );
}

const TABS = [
  { key: "posts", label: "POSTS", Icon: GridIcon },
  { key: "reels", label: "REELS", Icon: ReelIcon },
  { key: "tagged", label: "TAGGED", Icon: TagIcon },
];

const EMPTY = {
  posts: "No posts yet. If this is a fresh login the first sync may still be running; refresh in a moment.",
  reels: "No reels found for this account.",
  tagged: "No tagged posts found. Tagged posts only appear if Meta grants this app access to them.",
};

// Own posts per calendar month (UTC), with the REELS subset. Tagged posts are excluded.
async function fetchMonthlyCounts(accountId) {
  return sql`
    select to_char(date_trunc('month', ts), 'YYYY-MM') as month,
           count(*)::int as total,
           count(*) filter (where media_product_type = 'REELS')::int as reels
    from ig_posts
    where account_id = ${accountId} and source = 'own'
    group by 1
    order by 1`;
}

// Posts = own feed posts (not reels). Reels = own REELS. Tagged = media where the account is tagged.
async function fetchPosts(accountId, tab) {
  if (tab === "reels") {
    return sql`
      select ig_id, caption, media_type, media_url, thumbnail_url, permalink, ts,
             like_count, comments_count, children
      from ig_posts
      where account_id = ${accountId} and source = 'own' and media_product_type = 'REELS'
      order by ts desc`;
  }
  if (tab === "tagged") {
    return sql`
      select ig_id, caption, media_type, media_url, thumbnail_url, permalink, ts,
             like_count, comments_count, children
      from ig_posts
      where account_id = ${accountId} and source = 'tagged'
      order by ts desc`;
  }
  return sql`
    select ig_id, caption, media_type, media_url, thumbnail_url, permalink, ts,
           like_count, comments_count, children
    from ig_posts
    where account_id = ${accountId} and source = 'own'
      and (media_product_type is null or media_product_type <> 'REELS')
    order by ts desc`;
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-white font-sans text-[#262626]">
      <main className="mx-auto max-w-[935px]">{children}</main>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <li className="text-center sm:text-left">
      <span className="font-semibold">{value ?? "–"}</span>{" "}
      <span className="text-[#262626] sm:text-[#262626]">{label}</span>
    </li>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="rounded-lg bg-[#efefef] px-4 py-1.5 text-sm font-semibold hover:bg-[#dbdbdb]">
        Log out
      </button>
    </form>
  );
}

function GridIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ReelIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="4" />
      <path d="M10 8.5v7l6-3.5z" fill="currentColor" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 12a8 8 0 1 0-16 0 8 8 0 0 0 16 0z" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}
