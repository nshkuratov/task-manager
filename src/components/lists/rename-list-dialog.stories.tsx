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

export const UnchangedName: Story = {
  name: "R-LIST-6: the current name, even re-typed, cannot be saved",
  play: async ({ args }) => {
    const { dialog, input } = await findInput();
    const save = within(dialog).getByRole("button", { name: "Save name" });
    await expect(save).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, " Groceries ");
    await expect(save).toBeDisabled();
    await userEvent.type(input, "!");
    await expect(save).toBeEnabled();
    await expect(args.renameList).not.toHaveBeenCalled();
  },
};

export const DuplicateName: Story = {
  name: "R-LIST-6: a name another list has is refused on the field, and the dialog stays open",
  args: {
    renameList: fn<RenameListDialogProps["renameList"]>(() =>
      Promise.resolve({ ok: false, fieldErrors: { name: ["A list with this name already exists."] } }),
    ),
  },
  play: async ({ args }) => {
    const { dialog, input } = await findInput();
    await userEvent.clear(input);
    await userEvent.type(input, "Work");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save name" }));
    await expect(await within(dialog).findByRole("alert")).toHaveTextContent("A list with this name already exists.");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(/A list with this name already exists\./);
    await waitFor(() => expect(input).toHaveFocus());
    await expect(args.onOpenChange).not.toHaveBeenCalled();
  },
};

export const CancelCloses: Story = {
  name: "R-LIST-6: Cancel asks to close without renaming",
  play: async ({ args }) => {
    const { dialog } = await findInput();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await expect(args.onOpenChange).toHaveBeenCalledWith(false);
    await expect(args.renameList).not.toHaveBeenCalled();
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
