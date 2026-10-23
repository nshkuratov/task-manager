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
  error?: string;
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
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
