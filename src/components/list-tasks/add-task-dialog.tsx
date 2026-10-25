"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TaskForm } from "@/components/tasks/task-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult, CreateTaskInput } from "@/contracts";

export interface AddTaskDialogProps {
  listId: string;
  /** The viewer's IANA zone, for the deadline input. */
  timeZone: string;
  createTask: (input: CreateTaskInput) => Promise<ActionResult<unknown>>;
}

/** "Add task" button and the dialog it opens; a successful save closes it and confirms with a toast. */
export function AddTaskDialog({ listId, timeZone, createTask }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-full px-5">
          <PlusIcon aria-hidden />
          Add task
        </Button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-3xl p-6 sm:max-w-[450px]"
      >
        <DialogHeader>
          <DialogTitle className="text-xl leading-7 font-medium tracking-tight">Add task</DialogTitle>
        </DialogHeader>
        <TaskForm
          mode="create"
          timeZone={timeZone}
          onSubmit={(values) => createTask({ ...values, listId })}
          cancel={
            <Button asChild variant="outline" className="h-10 rounded-full px-5 dark:bg-transparent">
              <DialogClose>Cancel</DialogClose>
            </Button>
          }
          onSuccess={() => {
            setOpen(false);
            toast.success("Task added");
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
