"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Switches between the Instagram accounts linked to this login.
export function AccountMenu({ accounts, activeId, tab }) {
  const active = accounts.find((a) => a.id === activeId) ?? accounts[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          @{active.username}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {accounts.map((a) => (
          <DropdownMenuItem key={a.id} asChild>
            <Link href={`/dashboard?account=${a.id}&tab=${tab}`}>@{a.username}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
