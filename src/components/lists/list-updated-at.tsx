"use client";

import { useSyncExternalStore } from "react";
import { DISPLAY_LOCALE } from "@/lib/format-deadline";

const subscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverZone = () => "UTC";

export function ListUpdatedAt({ date }: { date: Date }) {
  const timeZone = useSyncExternalStore(subscribe, browserZone, serverZone);
  const label = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return (
    <time dateTime={date.toISOString()} title={`${date.toISOString()} (${timeZone})`}>
      {label}
    </time>
  );
}
