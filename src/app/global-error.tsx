"use client";

import type { ErrorInfo } from "next/error";
import type { CSSProperties } from "react";

// This page replaces the root layout, so it gets no global styles and no theme class: system colours and
// `color-scheme` keep it legible in the OS's light or dark scheme.
const page: CSSProperties = {
  colorScheme: "light dark",
  margin: 0,
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: "1rem",
  background: "Canvas",
  color: "CanvasText",
  fontFamily: "system-ui, sans-serif",
  textAlign: "center",
};
const button: CSSProperties = { font: "inherit", padding: "0.5rem 1rem", cursor: "pointer" };

export default function GlobalError({ retry }: ErrorInfo) {
  return (
    <html lang="en">
      <body style={page}>
        <title>Something went wrong · Task Manager</title>
        <main style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p>Task Manager could not load. Try again, or reload your lists.</p>
          <p style={{ display: "flex", gap: "1rem", justifyContent: "center", alignItems: "center" }}>
            <button type="button" style={button} onClick={retry}>
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload on purpose: the root layout is what failed */}
            <a href="/lists" style={{ color: "LinkText" }}>
              Back to lists
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
