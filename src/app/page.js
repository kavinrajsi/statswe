import { Suspense } from "react";
import Link from "next/link";

export default function Home({ searchParams }) {
  return (
    <Suspense>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 px-4 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Instame
      </h1>
      <p className="max-w-sm text-center text-zinc-600 dark:text-zinc-400">
        Log in with Facebook to see all posts from the Instagram Business or Creator accounts on your Pages.
      </p>
      <Link
        href="/api/auth/facebook/login"
        className="rounded-full bg-black px-6 py-3 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Login with Facebook
      </Link>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          Login failed ({error}). Please try again.
        </p>
      )}
    </div>
  );
}
