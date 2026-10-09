"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// One row per linked Instagram account: followers, reach and profile visits (last 30 days).
// Reach is not added up across accounts, so there is no total row.
export function AccountsOverview({ activeId, tab = "posts" }) {
  const [accounts, setAccounts] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/instagram/accounts-overview")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => !cancelled && setAccounts(json.accounts ?? []))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">All accounts</CardTitle>
        <CardDescription>Followers now, reach and profile visits, month to date</CardDescription>
      </CardHeader>
      <CardContent>
        {failed && (
          <Alert variant="destructive">
            <AlertDescription>Could not load the accounts overview. Log in again if this persists.</AlertDescription>
          </Alert>
        )}

        {!failed && accounts === null && <Skeleton className="h-32" />}

        {accounts && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Followers</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Profile visits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((a) => (
                  <TableRow key={a.id} data-state={a.id === activeId ? "selected" : undefined}>
                    <TableCell>
                      <Link href={`/dashboard?account=${a.id}&tab=${tab}`} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={a.pictureUrl ?? undefined} alt={`@${a.username}`} />
                          <AvatarFallback>{a.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">@{a.username}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{format(a.followers)}</TableCell>
                    <TableCell className="text-right">{format(a.reach)}</TableCell>
                    <TableCell className="text-right">{format(a.profileViews)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function format(value) {
  return value === null || value === undefined ? "–" : Number(value).toLocaleString();
}
