import { Suspense } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main className="relative flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">statswe</CardTitle>
          <CardDescription>
            Log in with Facebook to see all posts from the Instagram Business or Creator accounts on your Pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild size="lg" className="w-full">
            <Link href="/api/auth/facebook/login">Login with Facebook</Link>
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>Login failed ({error}). Please try again.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      <nav className="absolute inset-x-0 bottom-4 flex justify-center gap-4 text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms</Link>
        <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
      </nav>
    </main>
  );
}
