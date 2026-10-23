export const THEME_OPTIONS = ["light", "dark", "system"] as const;
export type ThemeOption = (typeof THEME_OPTIONS)[number];

export const THEME_LABELS: Record<ThemeOption, string> = { light: "Light", dark: "Dark", system: "System" };

export function isThemeOption(value: unknown): value is ThemeOption {
  return THEME_OPTIONS.some((option) => option === value);
}
