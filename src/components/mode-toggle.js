"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match system", icon: Monitor },
];

// Light / dark / system theme as a list. The current choice is marked.
export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ul className="divide-y rounded-lg border">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = theme === value;
        return (
          <li key={value}>
            <button
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={active}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted",
                active && "font-medium"
              )}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              {active && <Check className="h-4 w-4" />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
