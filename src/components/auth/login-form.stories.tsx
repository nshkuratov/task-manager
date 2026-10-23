import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { LoginForm, type SignInAction } from "./login-form";

const never = () => new Promise<never>(() => {});
const resolvesNothing = () => Promise.resolve(undefined);

const meta = {
  title: "Auth/LoginForm",
  component: LoginForm,
  args: { signIn: fn<SignInAction>(resolvesNothing) },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LoginForm>;

export default meta;
type Story = StoryObj<typeof meta>;

function fields(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  return {
    canvas,
    email: canvas.getByRole("textbox", { name: "Email" }),
    password: canvas.getByLabelText("Password"),
    submit: canvas.getByRole("button", { name: "Sign in" }),
  };
}

export const SubmitSuccess: Story = {
  name: "R-AUTH-1, R-AUTH-4, R-TEST-1: submitting valid credentials calls signIn with them",
  play: async ({ args, canvasElement }) => {
    const { email, password, submit } = fields(canvasElement);
    await expect(email).toHaveAttribute("autocomplete", "username");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
    await userEvent.type(email, "admin@example.com");
    await userEvent.type(password, "Admin123!");
    await userEvent.click(submit);
    await waitFor(() => expect(args.signIn).toHaveBeenCalledOnce());
    await expect(args.signIn).toHaveBeenCalledWith({ email: "admin@example.com", password: "Admin123!" });
  },
};

export const ValidationErrors: Story = {
  name: "R-AUTH-2, R-TEST-1: empty and malformed fields are flagged and nothing is sent",
  play: async ({ args, canvasElement }) => {
    const { canvas, email, password, submit } = fields(canvasElement);
    await userEvent.click(submit);

    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    await expect(password).toHaveAttribute("aria-invalid", "true");
    await expect(email).toHaveAccessibleDescription("Enter a valid email address");
    await expect(password).toHaveAccessibleDescription("Enter your password");
    await expect(email).toHaveFocus();

    await userEvent.type(email, "not-an-email");
    await userEvent.type(password, "secret");
    await waitFor(() => expect(password).not.toHaveAttribute("aria-invalid"));
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([
      "Enter a valid email address",
    ]);
    await expect(args.signIn).not.toHaveBeenCalled();
  },
};

export const ServerError: Story = {
  name: "R-AUTH-3, R-TEST-1: a rejected sign-in shows the error, keeps the email and clears the password",
  args: {
    signIn: fn<SignInAction>(() =>
      Promise.resolve({ ok: false as const, formError: "Email or password is incorrect." }),
    ),
  },
  play: async ({ canvasElement }) => {
    const { canvas, email, password, submit } = fields(canvasElement);
    await userEvent.type(email, "admin@example.com");
    await userEvent.type(password, "wrong");
    await userEvent.click(submit);

    await expect(await canvas.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
    await waitFor(() => expect(password).toHaveFocus());
    await expect(password).toHaveValue("");
    await expect(email).toHaveValue("admin@example.com");
  },
};

export const Loading: Story = {
  name: "R-AUTH-3, R-TEST-1: while signing in the form is busy and read-only",
  args: { signIn: fn<SignInAction>(never) },
  play: async ({ args, canvasElement }) => {
    const { canvas, email, password, submit } = fields(canvasElement);
    await userEvent.type(email, "admin@example.com");
    await userEvent.type(password, "Admin123!");
    await userEvent.click(submit);

    const busy = await canvas.findByRole("button", { name: "Signing in…" });
    await expect(busy).toHaveAttribute("aria-disabled", "true");
    await expect(busy).toHaveAttribute("aria-busy", "true");
    await expect(busy).toHaveFocus();
    await expect(canvas.getByRole("status")).toHaveTextContent("Signing in…");
    // A busy ancestor would let screen readers hold back the status announcement above.
    await expect(busy.closest("form")).not.toHaveAttribute("aria-busy");
    await expect(email).toHaveAttribute("readonly");
    await expect(password).toHaveAttribute("readonly");

    await userEvent.click(busy);
    await expect(args.signIn).toHaveBeenCalledOnce();
  },
};

export const ServerFieldErrors: Story = {
  name: "R-AUTH-2: field errors returned by the server are shown on their fields",
  args: {
    signIn: fn<SignInAction>(() =>
      Promise.resolve({
        ok: false as const,
        fieldErrors: { email: ["Enter a valid email address"], password: ["Enter your password"] },
      }),
    ),
  },
  play: async ({ canvasElement }) => {
    const { email, password, submit } = fields(canvasElement);
    await userEvent.type(email, "admin@example.com");
    await userEvent.type(password, "Admin123!");
    await userEvent.click(submit);

    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    await expect(email).toHaveAccessibleDescription("Enter a valid email address");
    await expect(password).toHaveAttribute("aria-invalid", "true");
    await expect(password).toHaveAccessibleDescription("Enter your password");
    await expect(password).toHaveValue("");
    await expect(email).toHaveFocus();
  },
};

export const PasswordVisibility: Story = {
  name: "R-AUTH-1: the toggle shows and hides the password",
  play: async ({ canvasElement }) => {
    const { canvas, password } = fields(canvasElement);
    const toggle = canvas.getByRole("button", { name: "Show password" });
    await expect(password).toHaveAttribute("type", "password");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(toggle);
    await expect(password).toHaveAttribute("type", "text");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(toggle);
    await expect(password).toHaveAttribute("type", "password");
  },
};

export const Dark: Story = {
  name: "Errors in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const { email, submit } = fields(canvasElement);
    await userEvent.click(submit);
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    await expect(document.documentElement).toHaveClass("dark");
  },
};
