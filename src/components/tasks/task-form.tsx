"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId, useState, useTransition, type ReactNode, type Ref } from "react";
import { Controller, useForm } from "react-hook-form";
import { ACTION_FORM_OPTIONS, splitActionErrors } from "@/components/common/action-form";
import { FieldError, FormErrorBanner, FormField } from "@/components/common/form-field";
import { PendingButton } from "@/components/common/pending-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  taskFieldsSchema,
  type ActionResult,
  type Task,
  type TaskFieldsInput,
  type TaskPriority,
  type TaskStatus,
} from "@/contracts";
import { fromDeadlineInstant, toDeadlineInstant } from "@/lib/local-deadline";
import { DeadlineInput } from "./deadline-input";

/** A complete set of raw form values (defaults, resets); what is submitted is the schema input. */
export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
}

const FIELDS = ["title", "description", "status", "priority", "deadline"] as const;

export const EMPTY_TASK_VALUES: TaskFormValues = {
  title: "",
  description: "",
  status: "new",
  priority: "medium",
  deadline: null,
};

/**
 * Edit-form defaults for a task. The deadline is rebuilt from its wall clock in `timeZone`, so it has the same
 * shape (zone offset, minute precision) the deadline input emits and an unchanged field never reads as dirty.
 */
export function taskToFormValues(
  task: Pick<Task, "title" | "description" | "status" | "priority" | "deadline">,
  timeZone: string,
): TaskFormValues {
  let deadline: string | null = null;
  if (task.deadline !== null) {
    const { date, time } = fromDeadlineInstant(task.deadline, timeZone);
    deadline = toDeadlineInstant(date, time, timeZone);
  }
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    deadline,
  };
}

export interface TaskFormProps {
  mode: "create" | "edit";
  /** The viewer's IANA zone, from the page (`getViewerTimeZone()`), so SSR and the browser agree. */
  timeZone: string;
  defaultValues?: TaskFormValues;
  /** The bound action (`createTask` with its `listId`, `updateTask` with its `id`). */
  onSubmit: (values: TaskFieldsInput) => Promise<ActionResult<unknown>>;
  /** Runs after a successful save; the host owns the success toast and closing. */
  onSuccess?: () => void;
  /** Reports unsaved changes, for the host's "Discard unsaved changes?" guard. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Extra footer control before the submit button; the dialogs pass their Cancel here. */
  cancel?: ReactNode;
  /** Places the extra control and submit button at opposite edges of the footer. */
  spreadActions?: boolean;
}

const SUBMIT_LABELS = {
  create: { idle: "Add task", pending: "Adding…" },
  edit: { idle: "Save changes", pending: "Saving…" },
} as const;

export function TaskForm({
  mode,
  timeZone,
  defaultValues = EMPTY_TASK_VALUES,
  onSubmit,
  onSuccess,
  onDirtyChange,
  cancel,
  spreadActions = false,
}: TaskFormProps) {
  const [pending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setFocus,
    reset,
    formState: { errors, isDirty },
  } = useForm<TaskFieldsInput>({
    // `raw`: the action re-parses the same values with the same schema, so it must get them untransformed.
    resolver: zodResolver(taskFieldsSchema, undefined, { raw: true }),
    defaultValues,
    ...ACTION_FORM_OPTIONS,
  });

  // Justified effect: it syncs a parent callback (the unsaved-changes guard); it loads no data.
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const blocked = pending || (mode === "edit" && !isDirty);

  const submit = handleSubmit((values) => {
    if (blocked) return;
    setFormError(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        reset(mode === "edit" ? values : EMPTY_TASK_VALUES);
        onSuccess?.();
        return;
      }

      const { placed, banner } = splitActionErrors(result, FIELDS);
      for (const [field, message] of placed) setError(field, { message });
      setFormError(banner);
      const firstInvalid = placed[0]?.[0];
      if (firstInvalid !== undefined) setFocus(firstInvalid);
    });
  });

  const labels = SUBMIT_LABELS[mode];

  return (
    <form
      noValidate
      className="grid gap-5"
      onSubmit={(event) => {
        if (blocked) {
          event.preventDefault();
          return;
        }
        void submit(event);
      }}
    >
      <FormErrorBanner message={formError} />

      <FormField label="Title" error={errors.title?.message}>
        <Input autoComplete="off" readOnly={pending} {...register("title")} />
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        <Textarea
          rows={3}
          readOnly={pending}
          className="field-sizing-fixed h-20 max-h-20 min-h-20 resize-none overflow-y-auto"
          {...register("description")}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <ChoiceField
              label="Status"
              options={TASK_STATUSES}
              optionLabels={STATUS_LABELS}
              value={field.value ?? EMPTY_TASK_VALUES.status}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              disabled={pending}
            />
          )}
        />
        <Controller
          control={control}
          name="priority"
          render={({ field, fieldState }) => (
            <ChoiceField
              label="Priority"
              options={TASK_PRIORITIES}
              optionLabels={PRIORITY_LABELS}
              value={field.value ?? EMPTY_TASK_VALUES.priority}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              disabled={pending}
            />
          )}
        />
      </div>

      <Controller
        control={control}
        name="deadline"
        render={({ field, fieldState }) => (
          <DeadlineInput
            ref={field.ref}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            timeZone={timeZone}
            error={fieldState.error?.message}
            readOnly={pending}
          />
        )}
      />

      <div className={`mt-1 flex items-center gap-3 ${spreadActions ? "justify-between" : "justify-end"}`}>
        {cancel}
        <PendingButton
          type="submit"
          pending={pending}
          pendingLabel={labels.pending}
          aria-disabled={blocked || undefined}
          size="pill"
        >
          {labels.idle}
        </PendingButton>
      </div>
    </form>
  );
}

/**
 * A labelled `Select`. Wired by hand because `FormField` passes its ARIA to its single child, and the child
 * here would be Radix's `Select.Root`, which renders no element of its own.
 */
function ChoiceField<T extends string>({
  label,
  options,
  optionLabels,
  value,
  onValueChange,
  onBlur,
  triggerRef,
  error,
  disabled,
}: {
  label: string;
  options: readonly T[];
  optionLabels: Record<T, string>;
  value: T;
  onValueChange: (value: T) => void;
  onBlur: () => void;
  triggerRef: Ref<HTMLButtonElement>;
  error: string | undefined;
  disabled: boolean;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        value={value}
        disabled={disabled}
        onValueChange={(next) => {
          const option = options.find((candidate) => candidate === next);
          if (option !== undefined) onValueChange(option);
        }}
      >
        <SelectTrigger
          ref={triggerRef}
          id={id}
          className="w-full"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onBlur={onBlur}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent aria-label={label}>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {optionLabels[option]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
