"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

// Heatmap of when followers are online: weekday (rows) by hour (columns), summed over the last 30 days. Times in IST.
export default function ActiveTimes({ accountId }) {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/instagram/active-times?account=${encodeURIComponent(accountId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setData(json))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (failed) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Could not load most active times. Log in again if this persists.</AlertDescription>
      </Alert>
    );
  }
  if (!data) return <Skeleton className="h-96" />;

  const max = Math.max(1, ...data.byDay.flat());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Most active times</CardTitle>
        <CardDescription>When followers are online · last 30 days · IST</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.days === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No activity data for this period.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-[640px] space-y-1">
                {/* Hour labels across the top */}
                <div className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] gap-1 text-[10px] text-muted-foreground">
                  <span />
                  {HOURS.map((h) => (
                    <span key={h} className="text-center">
                      {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
                    </span>
                  ))}
                </div>

                {DAYS.map((day, d) => (
                  <div key={day} className="grid grid-cols-[3rem_repeat(24,minmax(0,1fr))] items-center gap-1">
                    <span className="text-xs text-muted-foreground">{day}</span>
                    {HOURS.map((h) => {
                      const value = data.byDay[d][h];
                      const intensity = value / max;
                      return (
                        <div
                          key={h}
                          title={`${day} ${String(h).padStart(2, "0")}:00 IST · ${value.toLocaleString()}`}
                          className="aspect-square rounded-[3px] bg-muted"
                          style={value > 0 ? { background: "#2563eb", opacity: 0.15 + 0.85 * intensity } : undefined}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
              <span>Less</span>
              {[0.15, 0.4, 0.65, 0.9].map((o) => (
                <span key={o} className="h-3 w-3 rounded-[3px]" style={{ background: "#2563eb", opacity: o }} />
              ))}
              <span>More</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
