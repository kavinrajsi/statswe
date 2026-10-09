"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const PERIOD_LABELS = {
  "30d": "Last 30 days",
  mtd: "This month",
  prev: "Previous month",
};

// Picks the period for the audience cards: last 30 days, this month, or the previous month.
export function PeriodMenu({ value, onChange }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {PERIOD_LABELS[value]}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(PERIOD_LABELS).map(([key, label]) => (
          <DropdownMenuItem key={key} onClick={() => onChange(key)}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
