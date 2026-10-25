"use client";

import { Loader2Icon, SearchIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

const DEBOUNCE_MS = 250;

export interface ListsSearchProps {
  /** Replaces the URL update (stories); by default the query goes to `?q=` with `router.replace`. */
  onQueryChange?: (query: string) => void;
}

/** The search box. The URL is the state: the server filters on `?q=`, so a search is shareable and reloadable. */
export function ListsSearch({ onQueryChange }: ListsSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(urlQuery);
  const [seenUrlQuery, setSeenUrlQuery] = useState(urlQuery);
  const [sent, setSent] = useState(urlQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The URL changed from outside (e.g. "Clear search"): adopt it. The echo of this input's own update is
  // ignored, so text typed while a navigation is pending is never overwritten.
  if (urlQuery !== seenUrlQuery) {
    setSeenUrlQuery(urlQuery);
    if (urlQuery !== sent) {
      setValue(urlQuery);
      setSent(urlQuery);
    }
  }

  // Justified effect: cancels a pending debounce on unmount; it loads no data.
  useEffect(() => () => clearTimeout(timer.current), []);

  const send = (raw: string) => {
    const query = raw.trim();
    if (query === sent) return;
    setSent(query);
    if (onQueryChange) {
      onQueryChange(query);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (query === "") params.delete("q");
    else params.set("q", query);
    const search = params.toString();
    startTransition(() => {
      router.replace(search === "" ? pathname : `${pathname}?${search}`, { scroll: false });
    });
  };

  return (
    <div role="search" className="relative w-full sm:max-w-xs">
      <label htmlFor={id} className="sr-only">
        Search lists
      </label>
      <SearchIcon
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Search lists"
        className="h-9 rounded-full pr-8 pl-8"
        value={value}
        aria-busy={pending || undefined}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => send(next), DEBOUNCE_MS);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || value === "") return;
          event.preventDefault();
          clearTimeout(timer.current);
          setValue("");
          send("");
        }}
      />
      {pending ? (
        <Loader2Icon
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground"
        />
      ) : null}
      <span role="status" className="sr-only">
        {pending ? "Searching…" : ""}
      </span>
    </div>
  );
}
