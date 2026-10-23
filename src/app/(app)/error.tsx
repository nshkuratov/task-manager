"use client";

import type { ErrorInfo } from "next/error";
import { ErrorView } from "@/components/app-shell/error-view";

function digestOf(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") return error.digest;
  return undefined;
}

/** `retry` re-fetches the segment; `reset` only re-renders it, which cannot recover a Server Component error. */
export default function AppError({ error, retry }: ErrorInfo) {
  return <ErrorView onRetry={retry} digest={digestOf(error)} />;
}
