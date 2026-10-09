import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { getBrandColor, listCompetitors } from "@/lib/settings";
import { BrandStyle } from "@/app/dashboard/BrandStyle";
import { BrandColorForm } from "./BrandColorForm";
import { CompetitorsForm } from "./CompetitorsForm";

export default function Settings() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/");

  const [brandColor, competitors] = await Promise.all([
    getBrandColor(session.userId),
    listCompetitors(session.userId),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BrandStyle color={brandColor} />

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/dashboard" className="shrink-0 font-semibold tracking-tight">
            statswe
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <AppearanceCard />
        <BrandColorForm initialColor={brandColor} />
        <CompetitorsForm initialCompetitors={competitors} />
      </main>
    </div>
  );
}

// Light, dark or system theme. Lives on the settings page only.
function AppearanceCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appearance</CardTitle>
        <CardDescription>Choose light, dark or match your system.</CardDescription>
      </CardHeader>
      <CardContent>
        <ModeToggle />
      </CardContent>
    </Card>
  );
}
