import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/contracts";
import { DISPLAY_LOCALE } from "@/lib/format-deadline";
import { DeadlineLabel } from "./deadline-label";
import { PriorityBadge } from "./priority-badge";
import { StatusBadge } from "./status-badge";

const NOW = new Date("2026-10-22T10:00:00Z");
const HOUR = 60 * 60 * 1000;
const at = (offsetMs: number) => new Date(NOW.getTime() + offsetMs);
const label = { now: NOW, locale: DISPLAY_LOCALE, timeZone: "Europe/Amsterdam" };

function Gallery() {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        {TASK_STATUSES.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {TASK_PRIORITIES.map((priority) => (
          <PriorityBadge key={priority} priority={priority} />
        ))}
      </div>
      <ul className="grid gap-2">
        <li>
          <DeadlineLabel {...label} status="new" deadline={at(-50 * HOUR)} />
        </li>
        <li>
          <DeadlineLabel {...label} status="in_progress" deadline={at(5 * HOUR)} />
        </li>
        <li>
          <DeadlineLabel {...label} status="new" deadline={at(100 * HOUR)} />
        </li>
        <li>
          <DeadlineLabel {...label} status="done" deadline={at(-50 * HOUR)} />
        </li>
        <li>
          <DeadlineLabel {...label} status="new" deadline={null} />
        </li>
        <li>
          <DeadlineLabel {...label} timeZone="UTC" showTimeZone status="new" deadline={at(100 * HOUR)} />
        </li>
      </ul>
    </div>
  );
}

const meta = {
  title: "Tasks/Badges",
  component: Gallery,
} satisfies Meta<typeof Gallery>;

export default meta;
type Story = StoryObj<typeof meta>;

async function assertReaderWords(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  for (const text of ["New", "In progress", "Done", "High", "Medium", "Low"]) {
    await expect(canvas.getByText(text)).toBeVisible();
  }
  await expect(canvas.getByRole("img", { name: "Overdue" })).toBeInTheDocument();
  await expect(canvas.getByText("2 days overdue")).toBeVisible();
  await expect(canvas.getByRole("img", { name: "Due within 48 hours" })).toBeInTheDocument();
  await expect(canvas.getByText("in 5 hours")).toBeVisible();
  await expect(canvas.getAllByText("in 4 days")).toHaveLength(2);
  await expect(canvas.getAllByText("Tue 20 Oct, 10:00")).toHaveLength(2);
  await expect(canvas.getAllByText(/overdue$/)).toHaveLength(1);
  await expect(canvas.getByText("No deadline")).toBeVisible();
  await expect(canvas.getByText("Mon 26 Oct, 14:00 UTC")).toBeVisible();
  // Only the two flagged labels carry an icon; the done one is not flagged even though its date has passed.
  await expect(canvas.getAllByRole("img")).toHaveLength(2);
  for (const internal of [/in_progress/, /due-soon/, /\bnull\b/, /undefined/, /NaN/]) {
    await expect(canvasElement.textContent).not.toMatch(internal);
  }
}

export const ReaderVocabulary: Story = {
  name: "R-TASKS-1: badges and deadline labels use the reader's words, never colour alone",
  play: async ({ canvasElement }) => {
    await assertReaderWords(canvasElement);
  },
};

export const Dark: Story = {
  name: "Badges and labels in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await assertReaderWords(canvasElement);
    await expect(document.documentElement).toHaveClass("dark");
  },
};
