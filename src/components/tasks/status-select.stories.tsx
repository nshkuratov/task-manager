import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { startTransition, useState } from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import type { ActionResult, TaskStatus } from "@/contracts";
import { StatusSelect, type StatusSelectProps } from "./status-select";

type ChangeResult = ActionResult<unknown>;

function deferred() {
  let resolve: (result: ChangeResult) => void = () => {};
  const promise = new Promise<ChangeResult>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

/** Plays the server's part: the `status` prop changes only when the action reports success. */
function Revalidating(args: StatusSelectProps) {
  const [status, setStatus] = useState<TaskStatus>(args.status);
  return (
    <StatusSelect
      {...args}
      status={status}
      onChange={async (next) => {
        const result = await args.onChange(next);
        if (result.ok) {
          startTransition(() => {
            setStatus(next);
          });
        }
        return result;
      }}
    />
  );
}

const meta = {
  title: "Tasks/StatusSelect",
  component: StatusSelect,
  args: {
    status: "new",
    title: "Write report",
    onChange: fn<StatusSelectProps["onChange"]>(() => Promise.resolve({ ok: true, data: undefined })),
  },
  render: (args) => <Revalidating {...args} />,
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof StatusSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

const triggerOf = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("combobox", { name: "Status for Write report" });

/** Waits out the exit animation: until then Radix keeps the page aria-hidden and pointer-inert. */
async function waitUntilClosed(trigger: HTMLElement) {
  await waitFor(() => expect(page().queryByRole("listbox")).toBeNull());
  await waitFor(() => expect(trigger).not.toHaveAttribute("aria-hidden"));
}

async function choose(trigger: HTMLElement, label: string) {
  await userEvent.click(trigger);
  await userEvent.click(await page().findByRole("option", { name: label }));
  await waitUntilClosed(trigger);
}

async function expectToast(text: string) {
  const notifications = await page().findByRole("region", { name: /Notifications/ });
  const toast = await within(notifications).findByText(text);
  await waitFor(() => expect(toast).toBeVisible());
}

export const ChangeStatus: Story = {
  name: "R-TASKS-5, R-TEST-1: choosing Done shows it at once, calls onChange and keeps it after success",
  play: async ({ args, canvasElement }) => {
    const pending = deferred();
    const onChange = args.onChange as ReturnType<typeof fn<StatusSelectProps["onChange"]>>;
    onChange.mockImplementation(() => pending.promise);

    const trigger = triggerOf(canvasElement);
    await choose(trigger, "Done");
    await waitFor(() => expect(trigger).toHaveTextContent("Done"));
    await expect(trigger).toHaveAttribute("aria-busy", "true");
    await expect(onChange).toHaveBeenCalledOnce();
    await expect(onChange).toHaveBeenCalledWith("done");

    pending.resolve({ ok: true, data: undefined });
    await waitFor(() => expect(trigger).not.toHaveAttribute("aria-busy"));
    await expect(trigger).toHaveTextContent("Done");
  },
};

export const RollbackOnFailure: Story = {
  name: "R-TASKS-5, R-TEST-1: a failed change reverts to the previous status and announces an error",
  args: {
    status: "in_progress",
    onChange: fn<StatusSelectProps["onChange"]>(() =>
      Promise.resolve({ ok: false, formError: "This task no longer exists." }),
    ),
  },
  play: async ({ args, canvasElement }) => {
    const trigger = triggerOf(canvasElement);
    await choose(trigger, "Done");
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(args.onChange).toHaveBeenCalledWith("done");

    await expectToast("This task no longer exists.");
    await waitFor(() => expect(trigger).toHaveTextContent("In progress"));
    await expect(trigger).not.toHaveAttribute("aria-busy");
  },
};

export const FallbackMessage: Story = {
  name: "R-TASKS-5: a failure without a message names the task",
  args: { onChange: fn<StatusSelectProps["onChange"]>(() => Promise.resolve({ ok: false })) },
  play: async ({ canvasElement }) => {
    const trigger = triggerOf(canvasElement);
    await choose(trigger, "In progress");
    await expectToast("Couldn’t change the status of “Write report”.");
    await waitFor(() => expect(trigger).toHaveTextContent("New"));
  },
};

export const IgnoresWhilePending: Story = {
  name: "A second change while one is pending is ignored",
  args: { onChange: fn<StatusSelectProps["onChange"]>(() => new Promise<ChangeResult>(() => {})) },
  play: async ({ args, canvasElement }) => {
    const trigger = triggerOf(canvasElement);
    await choose(trigger, "Done");
    await waitFor(() => expect(trigger).toHaveAttribute("aria-disabled", "true"));
    await choose(trigger, "In progress");
    await expect(args.onChange).toHaveBeenCalledOnce();
    await expect(trigger).toHaveTextContent("Done");
  },
};

export const Dark: Story = {
  name: "Opens and closes by keyboard in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const trigger = triggerOf(canvasElement);
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const option = await page().findByRole("option", { name: "In progress" });
    await waitFor(() => expect(option).toBeVisible());
    // An open Select hides the rest of the page (trigger included) from assistive tech, which axe reports;
    // close it so the after-each scan sees the resting state.
    await userEvent.keyboard("{Escape}");
    await waitUntilClosed(trigger);
    await expect(trigger).toHaveFocus();
    await expect(document.documentElement).toHaveClass("dark");
  },
};
