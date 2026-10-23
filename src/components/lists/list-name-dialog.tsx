"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import {
  useRef,
  useState,
  useTransition,
  type ReactElement,
  type RefObject,
  type TransitionStartFunction,
} from "react";
import { useForm } from "react-hook-form";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createListSchema,
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
        showCloseButton={!pending}
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
  submitLabel,
  pendingLabel,
  pending,
  startTransition,
  inputRef,
  onSubmit,
  onSuccess,
}: {
  defaultName: string;
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
    formState: { errors },
  } = useForm<CreateListInput, unknown, CreateListOutput>({
    resolver: zodResolver(createListSchema),
    defaultValues: { name: defaultName },
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
  });
  const { ref: registerRef, ...nameField } = register("name");

  const submit = handleSubmit((values) => {
    if (pending) return;
    setFormError(null);
    // A throw inside the transition reaches the nearest error boundary; expected failures are results.
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        onSuccess(result.data);
        return;
      }
      const nameError = result.fieldErrors?.name?.[0];
      if (nameError !== undefined) {
        setError("name", { message: nameError });
        setFocus("name");
      }
      const unplaced = Object.entries(result.fieldErrors ?? {})
        .filter(([key]) => key !== "name")
        .flatMap(([, messages]) => messages?.slice(0, 1) ?? []);
      const message = [result.formError, ...unplaced].filter((part) => part !== undefined).join(" ");
      if (message !== "") setFormError(message);
    });
  });

  return (
    <form noValidate className="grid gap-5" onSubmit={(event) => void submit(event)}>
      {formError !== null ? (
        <div
          role="alert"
          className="rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive"
        >
          {formError}
        </div>
      ) : null}
      <FormField
        label="Name"
        description="Up to 80 characters."
        {...(errors.name?.message === undefined ? {} : { error: errors.name.message })}
      >
        <Input
          autoComplete="off"
          readOnly={pending}
          {...nameField}
          ref={(element) => {
            registerRef(element);
            inputRef.current = element;
          }}
        />
      </FormField>
      <DialogFooter>
        <Button
          type="submit"
          // aria-disabled, not disabled: disabling the focused button would drop focus out of the dialog.
          aria-disabled={pending || undefined}
          aria-busy={pending || undefined}
          className="aria-disabled:opacity-50"
        >
          {pending ? (
            <>
              <Loader2Icon aria-hidden className="animate-spin" />
              {pendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
      <p role="status" className="sr-only">
        {pending ? pendingLabel : ""}
      </p>
    </form>
  );
}
