import { parse, toGamut, wcagContrast, type Rgb } from "culori";

export type Theme = "light" | "dark";
export type ThemeTokens = Record<Theme, Record<string, string>>;

const THEME_SELECTORS: Record<Theme, string> = { light: ":root", dark: ".dark" };
// CSS Color 4 gamut mapping: an out-of-sRGB oklch token is measured as the colour the browser paints.
const toRgb = toGamut("rgb", "oklch");

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Reads the custom-property declarations of the top-level `:root` and `.dark` rules. Only a rule whose
 * selector starts a line counts, so `.dark` inside `@custom-variant` or a nested block is never matched.
 */
export function parseThemeTokens(css: string): ThemeTokens {
  const tokens: ThemeTokens = { light: {}, dark: {} };
  for (const theme of ["light", "dark"] as const) {
    const rule = new RegExp(`^${escapeRegExp(THEME_SELECTORS[theme])}\\s*\\{([^}]*)\\}`, "m").exec(css);
    if (!rule?.[1]) throw new Error(`No top-level "${THEME_SELECTORS[theme]}" rule found`);
    for (const [, name, value] of rule[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      if (name && value) tokens[theme][name] = value.trim();
    }
  }
  return tokens;
}

/** Parses a concrete colour; references (`var()`) and deferred mixes (`color-mix()`) are rejected. */
export function resolveColor(value: string): Rgb {
  if (/\b(var|color-mix)\(/.test(value)) throw new Error(`"${value}" is not a concrete colour`);
  const parsed = parse(value);
  if (!parsed) throw new Error(`"${value}" is not a parsable colour`);
  return toRgb(parsed);
}

/** Alpha-composites `top` over an opaque `bottom` in sRGB, the way the browser paints it. */
export function compositeOver(top: Rgb, bottom: Rgb): Rgb {
  const alpha = top.alpha ?? 1;
  const mix = (a: number, b: number) => a * alpha + b * (1 - alpha);
  return { mode: "rgb", r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b) };
}

/** Returns `color` with its alpha multiplied by `opacity` (Tailwind's `bg-x/30`). */
export function withOpacity(color: Rgb, opacity: number): Rgb {
  return { ...color, alpha: (color.alpha ?? 1) * opacity };
}

/** WCAG 2 contrast ratio; both colours must already be opaque (culori ignores alpha). */
export function contrastRatio(foreground: Rgb, background: Rgb): number {
  if ((foreground.alpha ?? 1) < 1 || (background.alpha ?? 1) < 1) {
    throw new Error("Composite translucent colours before measuring contrast");
  }
  return wcagContrast(foreground, background);
}
