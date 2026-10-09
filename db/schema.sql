create extension if not exists pgcrypto;

-- One row per Facebook user who logged in. Holds the long-lived user token.
create table if not exists fb_users (
  id               uuid primary key default gen_random_uuid(),
  fb_user_id       text not null unique,
  name             text,
  token_enc        text not null,           -- AES-256-GCM, see src/lib/crypto.js
  token_expires_at timestamptz not null,
  status           text not null default 'active',  -- active | needs_reauth
  created_at       timestamptz not null default now()
);

-- One row per Instagram Business/Creator account linked to a Facebook Page the user manages.
create table if not exists ig_accounts (
  id             uuid primary key default gen_random_uuid(),
  fb_user_id     uuid not null references fb_users(id) on delete cascade,
  page_id        text not null,
  ig_user_id     text not null unique,
  username       text not null,
  name           text,
  profile_picture_url text,
  followers_count int,
  follows_count  int,
  media_count    int,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists ig_posts (
  ig_id          text primary key,
  account_id     uuid not null references ig_accounts(id) on delete cascade,
  caption        text,
  media_type     text not null,             -- IMAGE | VIDEO | CAROUSEL_ALBUM
  media_url      text,                      -- CDN URL, expires; re-synced on sync
  thumbnail_url  text,
  permalink      text not null,
  ts             timestamptz not null,
  like_count     int,
  comments_count int,
  children       jsonb,                     -- carousel children
  media_product_type text,                  -- FEED | REELS | STORY (null on older rows)
  source         text not null default 'own',  -- own | tagged
  synced_at      timestamptz not null default now()
);

create index if not exists ig_posts_account_ts_idx on ig_posts (account_id, ts desc);

-- For databases created before the profile columns existed
alter table ig_accounts add column if not exists name text;
alter table ig_accounts add column if not exists profile_picture_url text;
alter table ig_accounts add column if not exists followers_count int;
alter table ig_accounts add column if not exists follows_count int;
alter table ig_accounts add column if not exists media_count int;
alter table ig_posts add column if not exists media_product_type text;
alter table ig_posts add column if not exists source text not null default 'own';
create index if not exists ig_posts_account_source_idx on ig_posts (account_id, source, media_product_type);

-- Daily snapshots of each post's insights (cumulative values as Meta reports them).
-- Only metrics are stored, never captions or media. Kept 90 days; see cron route.
create table if not exists ig_post_snapshots (
  ig_id         text not null references ig_posts(ig_id) on delete cascade,
  snapshot_date date not null,
  metrics       jsonb not null,
  followers     jsonb,
  taken_at      timestamptz not null default now(),
  primary key (ig_id, snapshot_date)
);

-- Set when Meta refuses insights for a post (posted before the account became a business account).
alter table ig_posts add column if not exists insights_unavailable boolean not null default false;

-- Public follower counts of usernames looked up from the search box. One row per user/username/day.
-- source: search (recorded when searched) | cron (daily re-snapshot). Kept about 13 months; see snapshot-lookups cron.
create table if not exists ig_lookup_followers (
  fb_user_id    uuid not null references fb_users(id) on delete cascade,
  username      text not null,
  snapshot_date date not null,
  followers     int  not null,
  source        text not null default 'search',
  primary key (fb_user_id, username, snapshot_date)
);

-- Monthly account metrics (dashboard "Month by month"). One row per account and calendar month (first day, UTC).
-- Completed months are stored once; the current month is refreshed on every load. Empty values mean Meta had no data.
create table if not exists ig_account_monthly (
  ig_user_id    text not null,
  month         date not null,
  followers     int,
  reach         int,
  profile_views int,
  fetched_at    timestamptz not null default now(),
  primary key (ig_user_id, month)
);

-- Per-login settings: brand colour as "#rrggbb" (null = default theme).
create table if not exists user_settings (
  fb_user_id  uuid primary key references fb_users(id) on delete cascade,
  brand_color text,
  updated_at  timestamptz not null default now()
);

-- Competitor Instagram usernames saved per login. Tracked daily by the snapshot-lookups cron.
create table if not exists ig_competitors (
  fb_user_id uuid not null references fb_users(id) on delete cascade,
  username   text not null,
  added_at   timestamptz not null default now(),
  primary key (fb_user_id, username)
);

-- Instagram stories, captured daily while they are live (Meta serves them for 24 hours only).
-- metrics holds the latest insights for the story. Kept 90 days; see capture-stories cron.
create table if not exists ig_stories (
  ig_id         text primary key,
  account_id    uuid not null references ig_accounts(id) on delete cascade,
  media_type    text,
  media_url     text,
  thumbnail_url text,
  permalink     text,
  ts            timestamptz not null,
  metrics       jsonb,
  captured_at   timestamptz not null default now()
);
create index if not exists ig_stories_account_ts_idx on ig_stories (account_id, ts desc);

-- Coordinates for audience city names ("Chennai, Tamil Nadu"), looked up once and reused.
-- lat/lon are null when no match was found, so the lookup isn't repeated.
create table if not exists city_geo (
  name       text primary key,
  lat        double precision,
  lon        double precision,
  looked_up_at timestamptz not null default now()
);
