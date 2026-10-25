"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "cn";
import { EyeIcon, EyeOffIcon, LockKeyholeIcon, MailIcon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { ACTION_FORM_OPTIONS, splitActionErrors } from "@/components/common/action-form";
import { FieldError, OVERLAY_ERROR } from "@/components/common/form-field";
import { PendingButton } from "@/components/common/pending-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type ActionResult, type LoginInput } from "@/contracts";

/** The `signIn` Server Action with `next` already bound. On success it redirects, so it resolves to nothing. */
export type SignInAction = (input: LoginInput) => Promise<ActionResult<unknown> | void>;

const FIELDS = ["email", "password"] as const;
const LOGIN_INPUT = "h-11.5 bg-background/30 pl-12 text-base focus-visible:border-foreground md:text-sm";
const FIELD_ICON = "pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground";

export function LoginForm({ signIn }: { signIn: SignInAction }) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const emailId = useId();
  const emailErrorId = `${emailId}-error`;
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
    ...ACTION_FORM_OPTIONS,
  });

  const submit = handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await signIn(values);
      if (result === undefined || result.ok) return;

      resetField("password");
      const { placed, banner } = splitActionErrors(result, FIELDS);
      for (const [field, message] of placed) setError(field, { message });
      setFormError(banner);
      setFocus(placed[0]?.[0] ?? "password");
    });
  });

  return (
    <form
      noValidate
      className="relative grid gap-7"
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        void submit(event);
      }}
    >
      <div className="-mb-[10px] grid gap-1.5">
        <Label htmlFor={emailId} className="text-sm font-normal">
          Email
        </Label>
        <div className="relative">
          <MailIcon aria-hidden className={FIELD_ICON} />
          <Input
            id={emailId}
            type="email"
            autoComplete="username"
            inputMode="email"
            placeholder="you@example.com"
            readOnly={pending}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? emailErrorId : undefined}
            className={cn(LOGIN_INPUT, "pr-4")}
            {...register("email")}
          />
          <div className={OVERLAY_ERROR}>
            <FieldError id={emailErrorId} message={errors.email?.message} />
          </div>
        </div>
      </div>

      {/* Hand-wired: FormField's Slot passes its ARIA to a single child, and this field needs a toggle beside it. */}
      <div className="grid gap-1.5">
        <Label htmlFor={passwordId} className="text-sm font-normal">
          Password
        </Label>
        <div className="relative">
          <LockKeyholeIcon aria-hidden className={FIELD_ICON} />
          <Input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Your password"
            readOnly={pending}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? passwordErrorId : undefined}
            className={cn(LOGIN_INPUT, "pr-12")}
            {...register("password")}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute inset-y-0.5 right-0.5 h-10.5 w-10.5 rounded-xl text-muted-foreground"
            aria-label="Show password"
            aria-pressed={showPassword}
            disabled={pending}
            onClick={() => {
              setShowPassword((shown) => !shown);
            }}
          >
            {showPassword ? <EyeOffIcon aria-hidden className="size-5" /> : <EyeIcon aria-hidden className="size-5" />}
          </Button>
          <div className={OVERLAY_ERROR}>
            <FieldError id={passwordErrorId} message={errors.password?.message} />
          </div>
        </div>
      </div>

      <PendingButton
        type="submit"
        pending={pending}
        pendingLabel="Signing in…"
        className="mt-1 h-11.5 w-full rounded-full bg-linear-to-br from-secondary-foreground/80 to-primary text-base font-medium shadow-lg shadow-primary/10 hover:brightness-110 dark:from-primary dark:to-primary/85"
      >
        Sign in
      </PendingButton>
      {formError !== null ? (
        <p role="alert" className="absolute inset-x-0 top-full mt-1 text-xs leading-4 text-destructive">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
