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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ActionResult, CreateTaskInput } from "@/contracts";

export interface AddTaskDialogProps {
  listId: string;
  listName: string;
  /** The viewer's IANA zone, for the deadline input. */
  timeZone: string;
  createTask: (input: CreateTaskInput) => Promise<ActionResult<unknown>>;
}

/** "Add task" button and the dialog it opens; a successful save closes it and confirms with a toast. */
export function AddTaskDialog({ listId, listName, timeZone, createTask }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="pill-lg">
          <PlusIcon aria-hidden />
          Add task
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
          <DialogDescription className="sr-only">New task in “{listName}”.</DialogDescription>
        </DialogHeader>
        <TaskForm
          mode="create"
          timeZone={timeZone}
          onSubmit={(values) => createTask({ ...values, listId })}
          cancel={
            <Button asChild variant="outline" size="pill">
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
