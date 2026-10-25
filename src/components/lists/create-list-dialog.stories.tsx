import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import { CreateListDialog, type CreateListDialogProps } from "./create-list-dialog";
import { LIST_IDS, taskList } from "./story-fixtures";

const meta = {
  title: "Lists/CreateListDialog",
  component: CreateListDialog,
  args: {
    createList: fn<CreateListDialogProps["createList"]>(({ name }) =>
      Promise.resolve({ ok: true, data: taskList(LIST_IDS.groceries, name) }),
    ),
  },
  decorators: [
    (Story, { globals }) => (
      <>
        <Story />
        <Toaster theme={globals.theme === "dark" ? "dark" : "light"} />
      </>
    ),
  ],
} satisfies Meta<typeof CreateListDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function openDialog(canvasElement: HTMLElement) {
  const trigger = within(canvasElement).getByRole("button", { name: "New list" });
  await userEvent.click(trigger);
  const dialog = await page().findByRole("dialog", { name: "New list" });
  const input = within(dialog).getByRole("textbox", { name: "Name" });
  await waitFor(() => expect(input).toHaveFocus());
  return { trigger, dialog, input };
}

export const Validation: Story = {
  name: "R-LIST-5, R-TEST-1: an empty name is refused with an announced error and no action call",
  play: async ({ args, canvasElement }) => {
    const { dialog, input } = await openDialog(canvasElement);
    await userEvent.type(input, "   ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create list" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent("Name is required");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveFocus();
    await expect(args.createList).not.toHaveBeenCalled();
  },
};

export const Submit: Story = {
  name: "R-LIST-5, R-TEST-1: submitting sends the trimmed name, closes the dialog and confirms",
  play: async ({ args, canvasElement }) => {
    const { dialog, input } = await openDialog(canvasElement);
    await userEvent.type(input, "  Groceries  ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create list" }));
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull());
    await expect(args.createList).toHaveBeenCalledOnce();
    await expect(args.createList).toHaveBeenCalledWith({ name: "Groceries" });
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText("List created")).toBeInTheDocument();
  },
};

export const ServerFieldError: Story = {
  name: "R-LIST-5: a server field error lands on the field and keeps the dialog open",
  args: {
    createList: fn<CreateListDialogProps["createList"]>(() =>
      Promise.resolve({ ok: false, fieldErrors: { name: ["Name must be 80 characters or fewer"] } }),
    ),
  },
  play: async ({ canvasElement }) => {
    const { dialog, input } = await openDialog(canvasElement);
    await userEvent.type(input, "Groceries");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create list" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent("Name must be 80 characters or fewer");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveValue("Groceries");
  },
};

export const ServerFormError: Story = {
  name: "R-LIST-5: a form-level failure is shown above the field",
  args: {
    createList: fn<CreateListDialogProps["createList"]>(() =>
      Promise.resolve({ ok: false, formError: "Something was wrong with this form. Reload the page and try again." }),
    ),
  },
  play: async ({ canvasElement }) => {
    const { dialog, input } = await openDialog(canvasElement);
    await userEvent.type(input, "Groceries");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create list" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent("Reload the page and try again.");
    await expect(input).not.toHaveAttribute("aria-invalid");
  },
};

let settle: (value: Awaited<ReturnType<CreateListDialogProps["createList"]>>) => void = () => {};

export const PendingBlocksClose: Story = {
  name: "R-LIST-5: while saving, the dialog shows progress, ignores Escape and a second submit, then closes",
  args: {
    createList: fn<CreateListDialogProps["createList"]>(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    ),
  },
  play: async ({ args, canvasElement }) => {
    const { dialog, input } = await openDialog(canvasElement);
    await userEvent.type(input, "Groceries");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create list" }));
    const button = await within(dialog).findByRole("button", { name: "Creating…" });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(within(dialog).getByRole("status")).toHaveTextContent("Creating…");
    await expect(input).toHaveAttribute("readonly");

    await userEvent.keyboard("{Escape}");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await userEvent.click(button);
    await expect(page().getByRole("dialog", { name: "New list" })).toBeInTheDocument();
    await expect(args.createList).toHaveBeenCalledOnce();

    settle({ ok: true, data: taskList(LIST_IDS.groceries, "Groceries") });
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull());
  },
};

export const EscapeCancels: Story = {
  name: "Escape cancels and returns focus to “New list”",
  play: async ({ args, canvasElement }) => {
    const { trigger } = await openDialog(canvasElement);
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page().queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(args.createList).not.toHaveBeenCalled();
  },
};

export const Dark: Story = {
  name: "Validation error in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    const { dialog } = await openDialog(canvasElement);
    await userEvent.click(within(dialog).getByRole("button", { name: "Create list" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent("Name is required");
  },
};
