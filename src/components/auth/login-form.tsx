"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/common/form-field";
import { PendingButton } from "@/components/common/pending-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type ActionResult, type LoginInput } from "@/contracts";

/** The `signIn` Server Action with `next` already bound. On success it redirects, so it resolves to nothing. */
export type SignInAction = (input: LoginInput) => Promise<ActionResult<unknown> | void>;

const FIELDS = ["email", "password"] as const;

export function LoginForm({ signIn }: { signIn: SignInAction }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const passwordId = useId();
  const passwordErrorId = `${passwordId}-error`;

  const {
    register,
    handleSubmit,
    setError,
    resetField,
    setFocus,
    formState: { errors },
  } = useForm<LoginInput>({
    // `raw`: the action re-parses the same values with the same schema, so it must get them untransformed.
    resolver: zodResolver(loginSchema, undefined, { raw: true }),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signIn(values);
      if (result === undefined || result.ok) return;

      resetField("password");
      for (const field of FIELDS) {
        const message = result.fieldErrors?.[field]?.[0];
        if (message !== undefined) setError(field, { message });
      }
      if (result.formError !== undefined) setFormError(result.formError);
      setFocus(result.fieldErrors?.email ? "email" : "password");
    });
  });

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        void submit(event);
      }}
    >
      {formError !== null ? (
        <div
          role="alert"
          className="rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive"
        >
          {formError}
        </div>
      ) : null}

      <FormField label="Email" {...(errors.email?.message === undefined ? {} : { error: errors.email.message })}>
        <Input type="email" autoComplete="username" inputMode="email" readOnly={pending} {...register("email")} />
      </FormField>

      {/* Hand-wired: FormField's Slot passes its ARIA to a single child, and this field needs a toggle beside it. */}
      <div className="grid gap-2">
        <Label htmlFor={passwordId}>Password</Label>
        <div className="relative">
          <Input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            readOnly={pending}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? passwordErrorId : undefined}
            className="pr-11"
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute inset-y-0 right-0 h-full"
            aria-label="Show password"
            aria-pressed={showPassword}
            disabled={pending}
            onClick={() => {
              setShowPassword((shown) => !shown);
            }}
          >
            {showPassword ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
          </Button>
        </div>
        {errors.password ? (
          <p id={passwordErrorId} role="alert" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <PendingButton type="submit" pending={pending} pendingLabel="Signing in…" className="w-full">
        Sign in
      </PendingButton>
    </form>
  );
}
