import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { fromDeadlineInstant } from "@/lib/local-deadline";
import { TaskForm, taskToFormValues, type TaskFormProps } from "./task-form";

const TIME_ZONE = "Europe/Amsterdam";
const ok = () => Promise.resolve({ ok: true as const, data: undefined });

const meta = {
  title: "Tasks/TaskForm",
  component: TaskForm,
  args: { mode: "create", timeZone: TIME_ZONE, onSubmit: fn<TaskFormProps["onSubmit"]>(ok), onSuccess: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = () => within(document.body);

function fields(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  return {
    canvas,
    title: canvas.getByRole("textbox", { name: "Title" }),
    description: canvas.getByRole("textbox", { name: "Description" }),
    status: canvas.getByRole("combobox", { name: "Status" }),
    priority: canvas.getByRole("combobox", { name: "Priority" }),
    date: canvas.getByLabelText("Date"),
    time: canvas.getByLabelText("Time (optional)"),
  };
}

async function choose(trigger: HTMLElement, option: string) {
  await userEvent.click(trigger);
  await userEvent.click(await page().findByRole("option", { name: option }));
  // Radix keeps the page inert until the listbox's exit animation ends.
  await waitFor(() => expect(page().queryByRole("listbox")).toBeNull());
}

export const ValidationErrors: Story = {
  name: "R-TASKS-2, R-TEST-1: an empty or too-long title is flagged, focused, and nothing is sent",
  play: async ({ args, canvasElement }) => {
    const { canvas, title } = fields(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(title).toHaveAttribute("aria-invalid", "true"));
    await expect(title).toHaveAccessibleDescription("Title is required");
    await expect(title).toHaveFocus();

    await userEvent.click(title);
    await userEvent.paste("x".repeat(121));
    await waitFor(() => expect(title).toHaveAccessibleDescription("Title must be 120 characters or fewer"));
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));
    await expect(title).toHaveAttribute("aria-invalid", "true");
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const CreateSubmit: Story = {
  name: "R-TASKS-2, R-TEST-1: a filled form submits raw values with a date-only deadline at 23:59 local",
  play: async ({ args, canvasElement }) => {
    const { canvas, title, description, status, priority, date, time } = fields(canvasElement);
    await expect(time).toBeDisabled();

    await userEvent.type(title, "Write report");
    await userEvent.type(description, "Quarterly numbers");
    await choose(status, "In progress");
    await choose(priority, "High");
    await userEvent.type(date, "2026-10-24");
    await expect(date).toHaveValue("2026-10-24");
    await expect(time).toBeEnabled();
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
    await expect(args.onSubmit).toHaveBeenCalledWith({
      title: "Write report",
      description: "Quarterly numbers",
      status: "in_progress",
      priority: "high",
      deadline: "2026-10-24T23:59:00+02:00",
    });
    const submitted = (args.onSubmit as ReturnType<typeof fn<TaskFormProps["onSubmit"]>>).mock.calls[0]?.[0];
    await expect(fromDeadlineInstant(new Date(submitted?.deadline ?? ""), TIME_ZONE)).toEqual({
      date: "2026-10-24",
      time: "23:59",
    });
    // A successful create starts over for the next task.
    await waitFor(() => expect(title).toHaveValue(""));
    await expect(args.onSuccess).toHaveBeenCalledOnce();
  },
};

export const ServerFieldError: Story = {
  name: "R-TASKS-2, R-TEST-1: a field error from the server is shown on that field and focused",
  args: {
    onSubmit: fn<TaskFormProps["onSubmit"]>(() =>
      Promise.resolve({ ok: false, fieldErrors: { title: ["Title must be 120 characters or fewer"] } }),
    ),
  },
  play: async ({ args, canvasElement }) => {
    const { canvas, title } = fields(canvasElement);
    await userEvent.type(title, "Fine on the client");
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(title).toHaveAttribute("aria-invalid", "true"));
    await expect(title).toHaveAccessibleDescription("Title must be 120 characters or fewer");
    await expect(title).toHaveFocus();
    await expect(title).toHaveValue("Fine on the client");
    await expect(args.onSuccess).not.toHaveBeenCalled();
  },
};

export const FormError: Story = {
  name: "R-TASKS-2: a form-level failure is announced and the input is kept",
  args: {
    onSubmit: fn<TaskFormProps["onSubmit"]>(() =>
      Promise.resolve({ ok: false, formError: "This list no longer exists." }),
    ),
  },
  play: async ({ args, canvasElement }) => {
    const { canvas, title } = fields(canvasElement);
    await userEvent.type(title, "Orphan");
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This list no longer exists.");
    await expect(title).toHaveValue("Orphan");
    await expect(args.onSuccess).not.toHaveBeenCalled();
  },
};

export const UnplacedFieldError: Story = {
  name: "R-TASKS-2: an error for a field the form does not show joins the form-level alert",
  args: {
    onSubmit: fn<TaskFormProps["onSubmit"]>(() =>
      Promise.resolve({
        ok: false,
        formError: "Could not save.",
        fieldErrors: { listId: ["This list could not be found"] },
      }),
    ),
  },
  play: async ({ args, canvasElement }) => {
    const { canvas, title } = fields(canvasElement);
    await userEvent.type(title, "Orphan");
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Could not save. This list could not be found");
    await expect(title).not.toHaveAttribute("aria-invalid");
    await expect(args.onSubmit).toHaveBeenCalledOnce();
    await expect(args.onSuccess).not.toHaveBeenCalled();
  },
};

const existing = {
  title: "Book flights",
  description: "Aisle seat",
  status: "in_progress" as const,
  priority: "low" as const,
  deadline: new Date("2026-10-24T15:00:00Z"),
};

export const EditSaveDisabledUntilDirty: Story = {
  name: "R-TASKS-3, R-CARD-2: edit mode is prefilled, and Save waits for a change",
  args: {
    mode: "edit",
    defaultValues: taskToFormValues(existing, TIME_ZONE),
    onDirtyChange: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const { canvas, title, status, priority, date, time } = fields(canvasElement);
    await expect(title).toHaveValue("Book flights");
    await expect(status).toHaveTextContent("In progress");
    await expect(priority).toHaveTextContent("Low");
    await expect(date).toHaveValue("2026-10-24");
    await expect(time).toHaveValue("17:00");

    const save = canvas.getByRole("button", { name: "Save changes" });
    await expect(save).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(save);
    await expect(args.onSubmit).not.toHaveBeenCalled();

    await userEvent.type(title, " to Rome");
    await waitFor(() => expect(save).not.toHaveAttribute("aria-disabled"));
    await expect(args.onDirtyChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(save);

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledOnce());
    await expect(args.onSubmit).toHaveBeenCalledWith({
      title: "Book flights to Rome",
      description: "Aisle seat",
      status: "in_progress",
      priority: "low",
      deadline: "2026-10-24T17:00:00+02:00",
    });
    await waitFor(() => expect(save).toHaveAttribute("aria-disabled", "true"));
    await expect(args.onDirtyChange).toHaveBeenLastCalledWith(false);
    await expect(args.onSuccess).toHaveBeenCalledOnce();
  },
};

export const Saving: Story = {
  name: "R-CARD-2: while saving the form is busy and read-only",
  args: { onSubmit: fn<TaskFormProps["onSubmit"]>(() => new Promise(() => {})) },
  play: async ({ args, canvasElement }) => {
    const { canvas, title } = fields(canvasElement);
    await userEvent.type(title, "Write report");
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));

    const busy = await canvas.findByRole("button", { name: "Adding…" });
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(canvas.getByRole("status")).toHaveTextContent("Adding…");
    await expect(title).toHaveAttribute("readonly");
    await userEvent.click(busy);
    await expect(args.onSubmit).toHaveBeenCalledOnce();
  },
};

export const Dark: Story = {
  name: "Errors in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const { canvas, title } = fields(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add task" }));
    await waitFor(() => expect(title).toHaveAttribute("aria-invalid", "true"));
    await expect(document.documentElement).toHaveClass("dark");
  },
};
