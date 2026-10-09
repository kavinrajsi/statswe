"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// Light / dark / system theme. next-themes sets the "dark" class on <html> before first paint.
export function ThemeProvider({ children, ...props }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  );
}
