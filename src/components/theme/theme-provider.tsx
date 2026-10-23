"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import type { ThemeOption } from "./theme-options";

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey,
}: {
  children: ReactNode;
  defaultTheme?: ThemeOption;
  /** Overrides the localStorage key; stories use their own so they never share a stored choice. */
  storageKey?: string;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem
      disableTransitionOnChange
      storageKey={storageKey}
    >
      {children}
    </NextThemesProvider>
  );
}
