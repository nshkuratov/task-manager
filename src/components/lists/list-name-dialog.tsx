"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactElement,
  type RefObject,
  type TransitionStartFunction,
} from "react";
import { useForm, useWatch } from "react-hook-form";
import { ACTION_FORM_OPTIONS, splitActionErrors } from "@/components/common/action-form";
import { FormErrorBanner, FormField } from "@/components/common/form-field";
import { PendingButton } from "@/components/common/pending-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  createListSchema,
  LIST_NAME_MAX,
  type ActionResult,
  type CreateListInput,
  type CreateListOutput,
  type TaskList,
} from "@/contracts";

export interface ListNameDialogProps {
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  defaultName?: string;
  /** Shown in the empty name field; rename is prefilled, so only create passes one. */
  placeholder?: string;
  /** Select the prefilled name on open, so typing replaces it. */
  selectOnOpen?: boolean;
  /** Receives the parsed (trimmed) name; the action re-validates it with the same `listNameSchema`. */
  onSubmit: (values: CreateListOutput) => Promise<ActionResult<TaskList>>;
  /** Runs after a successful save, just before the dialog closes; the host owns the toast and where focus goes. */
  onSuccess: (list: TaskList) => void;
  /** Uncontrolled mode: the element that opens the dialog. */
  trigger?: ReactElement;
  /** Controlled mode, e.g. opened from a menu item. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/** A dialog with one "Name" field, shared by create and rename. Pending blocks every way of closing it. */
export function ListNameDialog({
  title,
  description,
  submitLabel,
  pendingLabel,
  defaultName = "",
  placeholder,
  selectOnOpen = false,
  onSubmit,
  onSuccess,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ListNameDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Set on success: the host moves focus then, so Radix must not hand it back to the opener.
  const handedOff = useRef(false);
  const open = controlledOpen ?? uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (next) handedOff.current = false;
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault();
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
          if (selectOnOpen) inputRef.current?.select();
        }}
        onCloseAutoFocus={(event) => {
          if (handedOff.current) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ListNameForm
          defaultName={defaultName}
          placeholder={placeholder}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          pending={pending}
          startTransition={startTransition}
          inputRef={inputRef}
          onSubmit={onSubmit}
          onSuccess={(list) => {
            handedOff.current = true;
            onSuccess(list);
            setOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// Lives inside the content, which unmounts on close, so every opening starts from a fresh form.
function ListNameForm({
  defaultName,
  placeholder,
  submitLabel,
  pendingLabel,
  pending,
  startTransition,
  inputRef,
  onSubmit,
  onSuccess,
}: {
  defaultName: string;
  placeholder: string | undefined;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  startTransition: TransitionStartFunction;
  inputRef: RefObject<HTMLInputElement | null>;
  onSubmit: ListNameDialogProps["onSubmit"];
  onSuccess: (list: TaskList) => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    control,
    formState: { errors },
  } = useForm<CreateListInput, unknown, CreateListOutput>({
    resolver: zodResolver(createListSchema),
    defaultValues: { name: defaultName },
    ...ACTION_FORM_OPTIONS,
  });
  const { ref: registerRef, ...nameField } = register("name");
  const nameValue = useWatch({ control, name: "name" }) ?? "";
  const nameLength = nameValue.length;
  // Rename only: nothing to save while the (trimmed) name equals the current one.
  const unchanged = defaultName !== "" && nameValue.trim() === defaultName;

  const submit = handleSubmit((values) => {
    if (pending || unchanged) return;
    setFormError(null);
    // A throw inside the transition reaches the nearest error boundary; expected failures are results.
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        onSuccess(result.data);
        return;
      }
      const { placed, banner } = splitActionErrors(result, ["name"]);
      for (const [field, message] of placed) {
        setError(field, { message });
        setFocus(field);
      }
      setFormError(banner);
    });
  });

  return (
    <form noValidate className="grid gap-5" onSubmit={(event) => void submit(event)}>
      <FormErrorBanner message={formError} />
      <FormField
        label="Name"
        description={`Up to ${LIST_NAME_MAX} characters.`}
        descriptionClassName="sr-only"
        error={errors.name?.message}
        errorPlacement="overlay"
      >
        <NameInput
          count={nameLength}
          autoComplete="off"
          placeholder={placeholder}
          readOnly={pending}
          {...nameField}
          ref={(element: HTMLInputElement | null) => {
            registerRef(element);
            inputRef.current = element;
          }}
        />
      </FormField>
      <DialogFooter className="mt-4 gap-3">
        <Button asChild variant="outline" size="pill">
          <DialogClose aria-disabled={pending || undefined} className="aria-disabled:opacity-50">
            Cancel
          </DialogClose>
        </Button>
        <PendingButton type="submit" pending={pending} pendingLabel={pendingLabel} disabled={unchanged} size="pill">
          {submitLabel}
        </PendingButton>
      </DialogFooter>
    </form>
  );
}

/** The name field with the live character count pinned inside its right edge (announced via the field's description). */
function NameInput({ count, ...props }: ComponentProps<typeof Input> & { count: number }) {
  return (
    <div className="relative">
      <Input {...props} className="pr-14" />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
      >
        {count}/{LIST_NAME_MAX}
      </span>
    </div>
  );
}
