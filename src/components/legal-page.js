import Link from "next/link";

// Shared frame for the public policy pages: title, last-updated date, footer links.
export function LegalPage({ title, children }) {
  return (
    <main className="min-h-screen bg-muted/40 px-4 py-10">
      <article className="mx-auto max-w-2xl space-y-6 rounded-xl border bg-card p-6 text-sm leading-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground">Last updated 9 October 2026</p>
        </header>

        {children}

        <footer className="flex flex-wrap gap-4 border-t pt-4 text-xs text-muted-foreground">
          <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of service</Link>
          <Link href="/data-deletion" className="hover:text-foreground">Data deletion</Link>
          <Link href="/" className="hover:text-foreground">Back to login</Link>
        </footer>
      </article>
    </main>
  );
}

export function Section({ title, children }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
