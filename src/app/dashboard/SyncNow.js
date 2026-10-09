"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Pulls everything from Meta into the database now. The nightly job does the same at 01:00 IST.
export function SyncNow({ lastSyncedAt, compact = false }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/instagram/sync-data", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) setMessage("Sync failed. Try again.");
    else setMessage(json.ok ? "Synced" : "Synced with some gaps");
    router.refresh();
  }

  return (
    <div
      className={
        compact
          ? "flex flex-col items-end gap-2 text-xs"
          : "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm"
      }
    >
      <span className="text-muted-foreground">
        Last synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : "never"}
        {message && <span className="ml-2 text-foreground">· {message}</span>}
      </span>
      <Button size="sm" onClick={run} disabled={busy}>
        {busy ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  );
}
