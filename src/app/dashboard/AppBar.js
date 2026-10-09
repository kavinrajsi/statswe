import Link from "next/link";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./AccountMenu";

// Sticky top bar: name on the left; account switcher, settings and log out on the right.
export function AppBar({ accounts, activeId, tab }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/dashboard" className="shrink-0 font-semibold tracking-tight">
          statswe
        </Link>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {accounts.length > 1 && <AccountMenu accounts={accounts} activeId={activeId} tab={tab} />}
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
