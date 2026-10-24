import { cn } from "cn";
import { Slot } from "radix-ui";
import { useId, type ReactElement, type ReactNode } from "react";
import { Label } from "@/components/ui/label";

/**
 * Label + control + description + error, with the ids and ARIA wiring done once. The single child
 * control receives `id`, `aria-invalid` and `aria-describedby`; pass a custom `id` here, not on the
 * child, because the child's own props win over the injected ones and would orphan the label.
 */
export function FormField({
  label,
  description,
  error,
  id,
  className,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  error?: string | undefined;
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
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={controlId}>{label}</Label>
      <Slot.Root
        id={controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy === "" ? undefined : describedBy}
      >
        {children}
      </Slot.Root>
      {description ? (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      <FieldError id={errorId} message={error} />
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
    <div role="alert" className="rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive">
      {message}
    </div>
  ) : null;
}
