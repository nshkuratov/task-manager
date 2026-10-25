import { cn } from "cn";
import { Slot } from "radix-ui";
import { useId, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** Positions a field's error just under it, out of flow, in the small type the redesign uses. */
export const OVERLAY_ERROR = "absolute inset-x-0 top-full mt-0.5 [&>p]:text-xs [&>p]:leading-4";

/**
 * Label + control + description + error, with the ids and ARIA wiring done once. The single child
 * control receives `id`, `aria-invalid` and `aria-describedby`; pass a custom `id` here, not on the
 * child, because the child's own props win over the injected ones and would orphan the label.
 */
export function FormField({
  label,
  description,
  descriptionClassName,
  error,
  errorPlacement = "flow",
  id,
  className,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  /** E.g. `sr-only` when the control already shows the same information visually. */
  descriptionClassName?: string;
  error?: string | undefined;
  /** `overlay` hangs a one-line error under the field without moving the layout; keep such messages short. */
  errorPlacement?: "flow" | "overlay";
  id?: string;
  className?: string;
  children: ReactElement;
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;
  const describedBy = [description ? descriptionId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className={cn("grid gap-2", errorPlacement === "overlay" && "relative", className)}>
      <Label htmlFor={controlId}>{label}</Label>
      <Slot.Root
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy === "" ? undefined : describedBy}
      >
        {children}
      </Slot.Root>
      {description ? (
        <p id={descriptionId} className={cn("text-sm text-muted-foreground", descriptionClassName)}>
          {description}
        </p>
      ) : null}
      {errorPlacement === "overlay" ? (
        <div className={OVERLAY_ERROR}>
          <FieldError id={errorId} message={error} />
        </div>
      ) : (
        <FieldError id={errorId} message={error} />
      )}
    </div>
  );
}

/** A field's announced error; the control points at `id` via `aria-describedby`. Renders nothing without one. */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} role="alert" className="text-sm text-destructive">
      {message}
    </p>
  ) : null;
}

/** The form-level error above the fields: what no single input can show. Renders nothing without one. */
export function FormErrorBanner({ message }: { message: string | null }) {
  return message !== null ? (
    <div role="alert" className="rounded-xl border border-destructive px-3 py-2 text-sm font-medium text-destructive">
      {message}
    </div>
  ) : null;
}
