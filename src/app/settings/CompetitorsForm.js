"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const MESSAGES = {
  invalid_username: "Enter a valid Instagram username.",
  not_found: "No public Business or Creator account with that username.",
  too_many: "You can save up to 10 competitors. Remove one to add another.",
  no_account: "Link an Instagram account first.",
  no_page_token: "Log in again so the app can check this account.",
  lookup_failed: "Could not check this account. Try again.",
};

// Competitor Instagram accounts, tracked daily. Each one shows as a chip next to the search box.
export function CompetitorsForm({ initialCompetitors }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(MESSAGES[json.error] ?? "Could not add this competitor.");
      return;
    }
    setUsername("");
    router.refresh();
  }

  async function remove(name) {
    setBusy(true);
    setError(null);
    await fetch(`/api/settings/competitors?username=${encodeURIComponent(name)}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Competitors</CardTitle>
        <CardDescription>Up to 10 Instagram accounts. Their follower counts are tracked every day.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="@username"
            aria-label="Competitor username"
            className="max-w-xs"
          />
          <Button type="submit" disabled={busy || !username.trim()}>
            {busy ? "Checking…" : "Add"}
          </Button>
        </form>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Separator />

        {initialCompetitors.length === 0 ? (
          <p className="text-sm text-muted-foreground">No competitors saved yet.</p>
        ) : (
          <ul className="divide-y">
            {initialCompetitors.map((c) => (
              <li key={c.username} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium">@{c.username}</span>
                  <Badge variant="secondary" className="font-normal">
                    {c.followers === null ? "No count yet" : `${Number(c.followers).toLocaleString()} followers`}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(c.username)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
