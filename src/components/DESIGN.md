# Design system

The shared visual and interaction vocabulary every user-facing view builds on. Feature views own their
own `DESIGN.md`; this one covers what they inherit. Requirements: R-THEME-1, R-TECH-2, R-TECH-3, R-EVAL-4.

## Tokens

All colour comes from CSS variables in `src/app/globals.css`, declared once for light (`:root`) and once
for dark (`.dark`), and exposed to Tailwind through `@theme inline` (`bg-card`, `text-muted-foreground`, …).
Components never use raw colours (`text-white`, `bg-red-500`) or translucent token variants for text.

| Group | Tokens | Use |
| --- | --- | --- |
| Surfaces | `background`, `card`, `popover`, `muted`, `secondary`, `accent` | Page, cards, menus/toasts, quiet fills, hover/focus fills |
| Text | `foreground`, `*-foreground` of each surface, `muted-foreground` | Body text, text on a fill, secondary text |
| Action | `primary`, `destructive` (+ `-foreground`) | Primary buttons; destructive buttons and error text |
| Controls | `input`, `ring`, `border` | Field boundaries, focus ring, decorative dividers |
| Status | `status-new`, `status-in-progress`, `status-done` (+ `-foreground`) | Task status badges |
| Indicator | `indicator-overdue` (red), `indicator-due-soon` (amber) (+ `-foreground`) | The list card's deadline indicator |

Status and indicator colours are always paired: the `-foreground` on its own fill, or the `-foreground`
alone as text on `background`/`card`. The fill colour is never used as text.

Fonts: Geist Sans and Geist Mono, self-hosted through the `geist` package (`font-sans`, `font-mono`).

## Themes

Light, Dark and System, chosen from the theme toggle (a menu reading "Light" / "Dark" / "System" behind an
icon button named "Change theme (current: …)"). The choice persists in `localStorage` and next-themes'
inline script applies the `dark`/`light` class to `<html>` before first paint, so there is no flash.
Known limitation: the browser chrome colour (`theme-color`) follows the OS scheme, not the in-app choice.

## Contrast and focus rules

- Every text pair is at least **4.5:1** in both themes; control boundaries (`input`) and the focus `ring`
  are at least **3:1** against `background` and `card` (WCAG 1.4.11). `src/styles/contrast.test.ts`
  asserts every pair from the token values (translucent fills are composited over their surface first)
  and prints the measured table; a token that is missing or not a concrete colour fails the test.
- `border` is **decorative and exempt**: dividers and card edges carry no information. Anything that
  must be seen to be operated uses `input` or `ring` instead.
- Focus is always visible: a full-strength `ring` (never `ring-ring/50`); menu and select items add an inset `ring` on keyboard focus, because their `accent` highlight alone is near-invisible on `popover`; `aria-invalid` controls use a
  full-strength destructive ring.
- Colour never carries meaning alone: status and indicator badges also carry text, and an icon where
  space allows.
- `prefers-reduced-motion: reduce` collapses animations and transitions to near zero.
- Every story runs axe (`a11y.test: "error"`) in light and in an explicit `Dark` export.

## States vocabulary

Every data view provides these states, in these words:

| State | What the reader sees |
| --- | --- |
| Loading | A skeleton with the same layout as the loaded view (`loading.tsx`) |
| Empty | `EmptyState`: a friendly sentence ("No lists yet") + the primary action ("New list") |
| No results | Names the query or filter that matched nothing + a "Clear" action |
| Error | `error.tsx` with a plain explanation and a "Try again" action |
| Not found | `not-found.tsx` with a way back |
| Pending | The trigger shows a spinner and a verb in progress ("Deleting…"), is inert (`aria-disabled` when it holds focus, so focus stays put), and the verb is announced through a `role="status"` region |
| Done / failed | A toast (sonner, announced via `aria-live`) |

Destructive actions go through `ConfirmDialog`, whose title names what is lost ("Delete “Groceries” and
its 4 tasks?"). Its `onConfirm` contract: an **expected** failure (an `ActionResult` with `ok: false`) is
reported by the caller with a toast and returned as `false`, which keeps the dialog open for a retry; only
an **unexpected** throw reaches the nearest error boundary.

## Reader vocabulary

Internal terms never reach the screen:

| Internal | Reader sees |
| --- | --- |
| `new` | New |
| `in_progress` | In progress |
| `done` | Done |
| `due-soon` | Due within 48 hours |
| `overdue` | Overdue (as a status-like label) / "N overdue" (list-card indicator) |
| `deadline: null` | No deadline |
| `progress` | "N% done (d of t)", N = `Math.floor(progress × 100)`; an empty list reads "0% done (0 of 0)" |
| `high` / `medium` / `low` | High / Medium / Low |

## Shared components

- `PageHeader` — the view's single `h1` (one headline per view), optional description and actions.
- `EmptyState` — decorative icon (`aria-hidden`), an `h2` title, a sentence and the primary action.
- `FormField` — label, control, description, error. It injects `id`, `aria-invalid` and
  `aria-describedby` (description, then error) into its single child; the error has `role="alert"`.
  Pass a custom `id` to `FormField`, never to the child.
- `ConfirmDialog` — `AlertDialog` with a consequence sentence and a destructive confirm that shows a
  pending state; works with a `trigger` (focus returns to it) or controlled `open`/`onOpenChange`.
- `ThemeToggle` — renders a stable, disabled placeholder until mounted so server and client markup match.

## Adding a component

1. Prefer a shadcn/Radix primitive in `src/components/ui/`; keep its API and restyle only through tokens.
2. Shared, feature-agnostic pieces go in `src/components/common/`; feature pieces live with their feature.
3. Need a new colour? Add the token to **both** `:root` and `.dark`, map it in `@theme inline`, and add
   its pairs to the list in `src/styles/contrast.test.ts`.
4. Write stories with `play` functions that query by role and label, plus an explicit `Dark` export with
   `globals: { theme: "dark" }`. Leave menus or dialogs open at the end of a story when axe should scan
   them.
5. Add `"use client"` only when the component needs state, effects or browser APIs.
