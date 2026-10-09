import Link from "next/link";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "./AccountMenu";
import { LookupForm } from "./LookupBox";

// Sticky top bar: logo, username search, account switcher, theme toggle, log out.
export function AppBar({ accounts, activeId, tab }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/dashboard" className="shrink-0 font-semibold tracking-tight">
          Instame
        </Link>

        <div className="mx-auto w-full max-w-md">
          <LookupForm />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {accounts.length > 1 && <AccountMenu accounts={accounts} activeId={activeId} tab={tab} />}
          <ModeToggle />
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
