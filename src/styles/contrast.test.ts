import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { compositeOver, contrastRatio, parseThemeTokens, resolveColor, withOpacity, type Theme } from "./tokens";

const css = readFileSync(path.join(import.meta.dirname, "../app/globals.css"), "utf8");
const tokens = parseThemeTokens(css);

/** A token, optionally at a Tailwind opacity (`bg-input/30`) painted over another opaque token. */
type Paint = string | { token: string; opacity: number; over: string };
interface Pair {
  fg: Paint;
  bg: Paint;
  min: number;
  themes?: Theme[];
}

const TEXT = 4.5;
const UI = 3;
const STATUS_FILLS = [
  "status-new",
  "status-in-progress",
  "status-done",
  "indicator-overdue",
  "indicator-due-soon",
] as const;
const darkInputFill: Paint = { token: "input", opacity: 0.3, over: "background" };
const PRIORITY_FILLS = ["priority-high", "priority-medium", "priority-low"] as const;

const PAIRS: Pair[] = [
  { fg: "foreground", bg: "background", min: TEXT },
  { fg: "foreground", bg: "card", min: TEXT },
  { fg: "foreground", bg: "muted", min: TEXT },
  { fg: "foreground", bg: "popover", min: TEXT },
  { fg: "card-foreground", bg: "card", min: TEXT },
  { fg: "popover-foreground", bg: "popover", min: TEXT },
  { fg: "primary-foreground", bg: "primary", min: TEXT },
  { fg: "secondary-foreground", bg: "secondary", min: TEXT },
  { fg: "accent-foreground", bg: "accent", min: TEXT },
  { fg: "destructive-foreground", bg: "destructive", min: TEXT },
  {
    fg: "destructive-foreground",
    bg: { token: "destructive", opacity: 0.9, over: "background" },
    min: TEXT,
  },
  ...["background", "card", "popover", "muted", "accent"].map((bg) => ({ fg: "muted-foreground", bg, min: TEXT })),
  ...["background", "card", "popover"].map((bg) => ({ fg: "destructive", bg, min: TEXT })),
  ...STATUS_FILLS.flatMap((fill) =>
    [fill, "background", "card"].map((bg) => ({ fg: `${fill}-foreground`, bg, min: TEXT })),
  ),
  ...PRIORITY_FILLS.map((fill) => ({ fg: `${fill}-foreground`, bg: fill, min: TEXT })),
  { fg: "foreground", bg: darkInputFill, min: TEXT, themes: ["dark"] },
  { fg: "muted-foreground", bg: darkInputFill, min: TEXT, themes: ["dark"] },
  ...["background", "card"].flatMap((bg) => [
    { fg: "input", bg, min: UI },
    { fg: "ring", bg, min: UI },
  ]),
  // Keyboard focus inside menus and selects is an inset ring on the popover surface.
  { fg: "ring", bg: "popover", min: UI },
  // A focused destructive menu item tints its row: /10 in light, /20 in dark.
  {
    fg: "destructive",
    bg: { token: "destructive", opacity: 0.1, over: "popover" },
    min: TEXT,
    themes: ["light"],
  },
  {
    fg: "destructive",
    bg: { token: "destructive", opacity: 0.2, over: "popover" },
    min: TEXT,
    themes: ["dark"],
  },
];

function tokenColor(theme: Theme, name: string) {
  const value = tokens[theme][`--${name}`];
  if (value === undefined) throw new Error(`--${name} is not declared in the ${theme} theme`);
  return resolveColor(value);
}

function paint(theme: Theme, value: Paint, surface?: ReturnType<typeof resolveColor>) {
  if (typeof value === "string") {
    const color = tokenColor(theme, value);
    if ((color.alpha ?? 1) === 1) return color;
    if (!surface) throw new Error(`--${value} is translucent in the ${theme} theme; give it a surface`);
    return compositeOver(color, surface);
  }
  return compositeOver(withOpacity(tokenColor(theme, value.token), value.opacity), tokenColor(theme, value.over));
}

const label = (value: Paint) => (typeof value === "string" ? value : `${value.token}/${value.opacity * 100}`);
const rows: { theme: Theme; fg: string; bg: string; ratio: string; min: number }[] = [];

afterAll(() => {
  console.table(rows);
});

describe.each(["light", "dark"] as const)("R-THEME-1: token contrast (%s)", (theme) => {
  const pairs = PAIRS.filter((pair) => !pair.themes || pair.themes.includes(theme));

  it.each(pairs.map((pair) => [label(pair.fg), label(pair.bg), pair] as const))(
    "%s on %s meets its WCAG minimum",
    (_fg, _bg, pair) => {
      const bg = paint(theme, pair.bg);
      const ratio = contrastRatio(paint(theme, pair.fg, bg), bg);
      rows.push({ theme, fg: label(pair.fg), bg: label(pair.bg), ratio: ratio.toFixed(2), min: pair.min });
      expect(ratio, `${label(pair.fg)} on ${label(pair.bg)} (${theme}) = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
        pair.min,
      );
    },
  );

  it("declares --border (decorative, exempt from contrast)", () => {
    expect(tokens[theme]["--border"]).toBeDefined();
  });
});

describe("token helpers", () => {
  it("reads only top-level :root and .dark rules", () => {
    const parsed = parseThemeTokens(
      [
        "@custom-variant dark (&:where(.dark, .dark *));",
        "@media (x) { .dark { --decoy: red; } }",
        ":root {\n  --a: oklch(1 0 0);\n}",
        ".dark {\n  --a: oklch(0 0 0);\n}",
      ].join("\n"),
    );
    expect(parsed).toEqual({ light: { "--a": "oklch(1 0 0)" }, dark: { "--a": "oklch(0 0 0)" } });
  });

  it("fails when a theme rule is missing", () => {
    expect(() => parseThemeTokens(":root { --a: red; }")).toThrow('No top-level ".dark" rule');
  });

  it.each(["var(--primary)", "color-mix(in oklch, red, blue)", "not-a-colour"])("rejects %s", (value) => {
    expect(() => resolveColor(value)).toThrow();
  });

  it("composites a translucent colour over its surface", () => {
    const grey = compositeOver(resolveColor("oklch(1 0 0 / 50%)"), resolveColor("#000"));
    expect(grey.r).toBeCloseTo(0.5, 5);
    expect(grey.alpha).toBeUndefined();
  });

  it("refuses to measure a translucent colour directly", () => {
    expect(() => contrastRatio(resolveColor("oklch(1 0 0 / 10%)"), resolveColor("#000"))).toThrow("Composite");
  });
});

/**
 * `.on-image` overrides, against the pixel of the app background each one contrasts worst with: the darkest
 * pixel of the light image, the lightest of the dark one (sampled at 200x112 from public/images/*.webp).
 * Re-measure these if the images change.
 */
const IMAGE_EXTREMES: Record<Theme, string> = { light: "rgb(218 227 242)", dark: "rgb(101 106 116)" };

function declarations(selector: RegExp): Record<string, string> {
  const body = selector.exec(css)?.[1];
  if (body === undefined) throw new Error(`no ${String(selector)} rule in globals.css`);
  return Object.fromEntries(
    [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value?.trim()]),
  );
}

describe.each(["light", "dark"] as const)("R-THEME-1: text on the background image (%s)", (theme) => {
  // The cascade: theme tokens, then `.on-image`, then (dark only) `.dark .on-image`.
  const onImage = {
    ...tokens[theme],
    ...declarations(/^\.on-image\s*\{([^}]*)\}/m),
    ...(theme === "dark" ? declarations(/^\.dark \.on-image\s*\{([^}]*)\}/m) : {}),
  };

  it.each([
    ["muted-foreground", TEXT],
    ["foreground", TEXT],
    ["indicator-overdue-foreground", TEXT],
    ["ring", UI],
  ] as const)("%s meets its WCAG minimum against the image", (token, min) => {
    const value = onImage[`--${token}`];
    if (value === undefined) throw new Error(`--${token} is not declared`);
    const ratio = contrastRatio(resolveColor(value), resolveColor(IMAGE_EXTREMES[theme]));
    expect(ratio, `${token} on the ${theme} image = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(min);
  });
});
