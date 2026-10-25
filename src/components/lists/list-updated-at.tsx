import { DISPLAY_LOCALE } from "@/lib/format-deadline";

/**
 * `timeZone` is the viewer's (`getViewerTimeZone()`), so the server and the browser render the same text;
 * `showTimeZone` names the zone when that is the UTC fallback rather than the viewer's own, as deadlines do.
 */
export function ListUpdatedAt({
  date,
  timeZone,
  showTimeZone,
}: {
  date: Date;
  timeZone: string;
  showTimeZone: boolean;
}) {
  const label = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    ...(showTimeZone ? { timeZoneName: "short" } : {}),
  }).format(date);
  return (
    <time dateTime={date.toISOString()} title={`${date.toISOString()} (${timeZone})`}>
      {label}
    </time>
  );
}
