import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppBar } from "./AppBar";
import { ProfileCard } from "./ProfileCard";
import PostGrid from "./PostGrid";
import AccountInsights from "./AccountInsights";
import RecentMonths from "./RecentMonths";
import { LookupGate, LookupProvider, LookupResults } from "./LookupBox";
import { Grid2x2, Play, Tag } from "lucide-react";

export default function Dashboard({ searchParams }) {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}>
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
        <Card className="mx-auto mt-16 max-w-md text-center">
          <CardHeader>
            <CardTitle>No Instagram account found</CardTitle>
            <CardDescription>
              Your Facebook login worked, but none of your Pages has an Instagram Business or Creator account
              linked. Link one, then log in again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="outline">
                Log out
              </Button>
            </form>
          </CardContent>
        </Card>
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
      <Shell appBar={<AppBar accounts={accounts} activeId={active.id} tab={tab} />}>
        <LookupResults />

        <LookupGate>
          <ProfileCard
            username={active.username}
            name={active.name}
            pictureUrl={active.profile_picture_url}
            posts={active.media_count ?? posts.length}
            followers={active.followers_count}
            following={active.follows_count}
          />

          <AccountInsights key={active.id} accountId={active.id}>
            <RecentMonths months={months} />
          </AccountInsights>

          <Tabs value={tab} className="pt-2">
            <TabsList className="grid w-full grid-cols-3">
              {TABS.map(({ key, label, Icon }) => (
                <TabsTrigger key={key} value={key} asChild>
                  <Link href={`/dashboard?account=${active.id}&tab=${key}`}>
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">{EMPTY[tab]}</p>
          ) : (
            <PostGrid posts={posts} />
          )}
        </LookupGate>
      </Shell>
    </LookupProvider>
  );
}

const TABS = [
  { key: "posts", label: "Posts", Icon: Grid2x2 },
  { key: "reels", label: "Reels", Icon: Play },
  { key: "tagged", label: "Tagged", Icon: Tag },
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

function Shell({ appBar, children }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {appBar}
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">{children}</main>
    </div>
  );
}
