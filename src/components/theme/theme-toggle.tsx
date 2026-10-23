"use client";

import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isThemeOption, THEME_LABELS, THEME_OPTIONS, type ThemeOption } from "./theme-options";

const THEME_ICONS: Record<ThemeOption, LucideIcon> = { light: SunIcon, dark: MoonIcon, system: MonitorIcon };

const subscribe = () => () => {};

/** False during SSR and hydration, true afterwards: the stored theme is unknowable on the server. */
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" aria-label="Change theme" disabled>
        <MonitorIcon aria-hidden />
      </Button>
    );
  }

  const current = isThemeOption(theme) ? theme : "system";
  const CurrentIcon = THEME_ICONS[current];

  return (
    // Non-modal: a modal menu aria-hides the rest of the page, trigger included, while it stays focusable.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Change theme (current: ${THEME_LABELS[current]})`}>
          <CurrentIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => {
            if (isThemeOption(value)) setTheme(value);
          }}
        >
          {THEME_OPTIONS.map((option) => {
            const Icon = THEME_ICONS[option];
            return (
              <DropdownMenuRadioItem key={option} value={option}>
                <Icon aria-hidden />
                {THEME_LABELS[option]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
