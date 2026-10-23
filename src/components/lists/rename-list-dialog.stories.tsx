import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { Toaster } from "@/components/ui/sonner";
import { RenameListDialog, type RenameListDialogProps } from "./rename-list-dialog";
import { LIST_GONE, LIST_IDS, taskList } from "./story-fixtures";

// Controlled and always open: a close request surfaces as onOpenChange(false), which the spy records.
const meta = {
  title: "Lists/RenameListDialog",
  component: RenameListDialog,
  args: {
    list: taskList(LIST_IDS.groceries, "Groceries"),
    open: true,
    onOpenChange: fn(),
    renameList: fn<RenameListDialogProps["renameList"]>(({ id, name }) =>
      Promise.resolve({ ok: true, data: taskList(id, name) }),
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
} satisfies Meta<typeof RenameListDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

async function findInput() {
  const dialog = await page().findByRole("dialog", { name: "Rename “Groceries”" });
  const input = within(dialog).getByRole("textbox", { name: "Name" });
  await waitFor(() => expect(input).toHaveFocus());
  return { dialog, input: input as HTMLInputElement };
}

export const Submit: Story = {
  name: "R-LIST-6, R-TEST-1: prefilled and selected; the edited name is sent and the dialog asks to close",
  play: async ({ args }) => {
    const { dialog, input } = await findInput();
    await expect(input).toHaveValue("Groceries");
    await expect([input.selectionStart, input.selectionEnd]).toEqual([0, "Groceries".length]);
    await userEvent.keyboard("Weekly groceries ");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
    await expect(args.renameList).toHaveBeenCalledOnce();
    await expect(args.renameList).toHaveBeenCalledWith({ id: LIST_IDS.groceries, name: "Weekly groceries" });
    const notifications = await page().findByRole("region", { name: /Notifications/ });
    await expect(await within(notifications).findByText("List renamed")).toBeInTheDocument();
  },
};

export const ListGone: Story = {
  name: "R-LIST-6: renaming a list that no longer exists says so and stays open",
  args: {
    renameList: fn<RenameListDialogProps["renameList"]>(() => Promise.resolve({ ok: false, formError: LIST_GONE })),
  },
  play: async ({ args }) => {
    const { dialog, input } = await findInput();
    await userEvent.type(input, "Other");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent(LIST_GONE);
    await expect(args.onOpenChange).not.toHaveBeenCalled();
  },
};

export const InvalidIdJoinsFormError: Story = {
  name: "A field error without a field (the id) is shown as the form error",
  args: {
    renameList: fn<RenameListDialogProps["renameList"]>(() =>
      Promise.resolve({ ok: false, fieldErrors: { id: ["This list could not be found"] } }),
    ),
  },
  play: async () => {
    const { dialog, input } = await findInput();
    await userEvent.type(input, "Other");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent("This list could not be found");
    await expect(input).not.toHaveAttribute("aria-invalid");
  },
};

export const Dark: Story = {
  name: "Open in the dark theme",
  globals: { theme: "dark" },
  play: async () => {
    await expect(document.documentElement).toHaveClass("dark");
    await findInput();
  },
};
