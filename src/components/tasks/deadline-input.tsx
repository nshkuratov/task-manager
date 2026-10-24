"use client";

import { useId, useState, type Ref } from "react";
import { FieldError } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_DEADLINE_TIME, fromDeadlineInstant, toDeadlineInstant } from "@/lib/local-deadline";

export interface DeadlineInputProps {
  /** The raw form value: an ISO instant with offset, or `null` for no deadline. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  onBlur?: () => void;
  /** Attached to the date input, so focus-on-error lands there. */
  ref?: Ref<HTMLInputElement>;
  /** The viewer's IANA zone; the entered wall clock is read in it. */
  timeZone: string;
  error?: string | undefined;
  readOnly?: boolean;
}

interface Parts {
  date: string;
  time: string;
}

const EMPTY: Parts = { date: "", time: "" };

// Tab reaches the calendar/clock button inside the input's shadow root, where the input stops matching
// :focus-visible; :focus-within keeps the app's ring on the field while that button has focus.
const PICKER_FOCUS = "w-auto focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring";

function partsOf(value: string | null | undefined, timeZone: string): Parts {
  if (value === null || value === undefined || value === "") return EMPTY;
  const instant = new Date(value);
  // Not an instant: the raw date this input emitted when it could not convert it (see `emit`).
  return Number.isNaN(instant.getTime()) ? { date: value, time: "" } : fromDeadlineInstant(instant, timeZone);
}

/**
 * A date, an optional time and a "Clear deadline" button, emitting one ISO instant in the viewer's zone. A date
 * without a time means 23:59 that day.
 */
export function DeadlineInput({ value, onChange, onBlur, ref, timeZone, error, readOnly = false }: DeadlineInputProps) {
  const id = useId();
  const dateId = `${id}-date`;
  const timeId = `${id}-time`;
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  const [parts, setParts] = useState<Parts>(() => partsOf(value, timeZone));
  const [lastValue, setLastValue] = useState(value);
  // A value this input did not emit (a form reset, new defaults) replaces what is on screen.
  if (value !== lastValue) {
    setLastValue(value);
    setParts(partsOf(value, timeZone));
  }

  const emit = (next: Parts) => {
    const cleared = next.date === "" ? EMPTY : next;
    let out: string | null = null;
    if (cleared.date !== "") {
      try {
        out = toDeadlineInstant(cleared.date, cleared.time === "" ? undefined : cleared.time, timeZone);
      } catch (conversionError) {
        if (!(conversionError instanceof RangeError)) throw conversionError;
        // Hand the unconvertible date to the form as-is; the schema rejects it with its own message.
        out = cleared.date;
      }
    }
    setParts(cleared);
    setLastValue(out);
    onChange(out);
  };

  const describedBy = error ? `${descriptionId} ${errorId}` : descriptionId;

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-sm leading-none font-medium">Deadline</legend>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor={dateId} className="font-normal">
            Date
          </Label>
          <Input
            ref={ref}
            id={dateId}
            type="date"
            className={PICKER_FOCUS}
            value={parts.date}
            readOnly={readOnly}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => {
              emit({ ...parts, date: event.target.value });
            }}
            onBlur={onBlur}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={timeId} className="font-normal">
            Time (optional)
          </Label>
          <Input
            id={timeId}
            type="time"
            className={PICKER_FOCUS}
            value={parts.time}
            readOnly={readOnly}
            disabled={parts.date === ""}
            aria-describedby={descriptionId}
            onChange={(event) => {
              emit({ ...parts, time: event.target.value });
            }}
            onBlur={onBlur}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={readOnly || parts.date === ""}
          onClick={(event) => {
            emit(EMPTY);
            // The button disables itself; send focus somewhere useful instead of to <body>.
            event.currentTarget.closest("fieldset")?.querySelector<HTMLInputElement>('input[type="date"]')?.focus();
          }}
        >
          Clear deadline
        </Button>
      </div>
      <p id={descriptionId} className="text-sm text-muted-foreground">
        Optional. Without a time, the deadline is {DEFAULT_DEADLINE_TIME}.
      </p>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}
