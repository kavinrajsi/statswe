"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { contrastRatio, normalizeHex } from "@/lib/brand";

const DEFAULT_COLOR = "#c13584";
const PRESETS = ["#c13584", "#2563eb", "#16a34a", "#f97316", "#7a2ff7", "#0891b2", "#dc2626", "#111827"];

// Brand colour for buttons, active tabs, charts and highlights. Saved per login.
export function BrandColorForm({ initialColor }) {
  const router = useRouter();
  const [value, setValue] = useState(initialColor ?? DEFAULT_COLOR);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const hex = normalizeHex(value);
  // Low contrast on either background: the app adjusts the colour automatically, so only warn
  const lowContrast =
    hex && (contrastRatio(hex, "#ffffff") < 3 || contrastRatio(hex, "#0a0a0a") < 3);

  async function save(color) {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/settings/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Could not save the colour. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Brand colour</CardTitle>
        <CardDescription>Used for buttons, active tabs, charts and highlights.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="color"
            aria-label="Pick a colour"
            value={hex ?? DEFAULT_COLOR}
            onChange={(e) => setValue(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-md border bg-transparent p-1"
          />
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#c13584"
            className="w-36 font-mono"
            aria-invalid={!hex}
          />
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                aria-label={`Use ${p}`}
                onClick={() => setValue(p)}
                className="h-7 w-7 rounded-full border-2 border-background shadow ring-1 ring-border"
                style={{ background: p }}
              />
            ))}
          </div>
        </div>

        {!hex && <p className="text-sm text-destructive">Enter a colour like #c13584.</p>}

        {hex && (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Preview</p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-medium"
                style={{ background: hex, color: contrastRatio("#000000", hex) >= contrastRatio("#ffffff", hex) ? "#000000" : "#ffffff" }}
              >
                Button
              </button>
              <span className="rounded-md px-3 py-1.5 text-sm font-medium" style={{ background: hex, color: "#ffffff" }}>
                Active tab
              </span>
              <span className="h-6 w-24 rounded" style={{ background: hex }} />
            </div>
            {lowContrast && (
              <p className="text-xs text-muted-foreground">
                This colour is very light or very dark on one of the backgrounds. It will be adjusted for readability.
              </p>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save(hex)} disabled={!hex || saving}>
            {saving ? "Saving…" : "Save colour"}
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => {
              setValue(DEFAULT_COLOR);
              save(null);
            }}
          >
            Reset to default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
