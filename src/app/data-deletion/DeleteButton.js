"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Two steps: first click asks to confirm, second click deletes everything and logs out.
export function DeleteButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function remove() {
    setBusy(true);
    setFailed(false);
    const res = await fetch("/api/account/delete", { method: "POST" }).catch(() => null);
    if (res?.redirected || res?.ok) {
      router.push("/");
      router.refresh();
      return;
    }
    setBusy(false);
    setFailed(true);
  }

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Delete my data
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">This removes all statswe data for your login and logs you out. It cannot be undone.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={remove} disabled={busy}>
          {busy ? "Deleting…" : "Yes, delete everything"}
        </Button>
        <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
          Cancel
        </Button>
      </div>
      {failed && <p className="text-sm text-destructive">Deletion failed. Try again or email the address above.</p>}
    </div>
  );
}
