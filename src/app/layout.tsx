import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { TimezoneCookieScript } from "@/components/theme/timezone-cookie-script";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Task Manager", template: "%s · Task Manager" },
  description: "Organise tasks into lists, track deadlines and see what is overdue at a glance.",
};

// Keyed on the OS scheme, not the in-app choice: Light picked on a dark OS still gets dark browser chrome.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        <TimezoneCookieScript />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
