import { z } from "zod";

const EMAIL_ERROR = "Enter a valid email address";
const PASSWORD_REQUIRED = "Enter your password";

export const loginSchema = z.object(
  {
    email: z
      .string({ error: EMAIL_ERROR })
      .trim()
      .toLowerCase()
      .pipe(z.email({ error: EMAIL_ERROR })),
    // Not trimmed: spaces in a password belong to the password.
    password: z
      .string({ error: PASSWORD_REQUIRED })
      .min(1, { error: PASSWORD_REQUIRED })
      .max(200, { error: "Password must be 200 characters or fewer" }),
  },
  { error: "Enter your email and password" },
);

export type LoginInput = z.input<typeof loginSchema>;
export type LoginOutput = z.output<typeof loginSchema>;
