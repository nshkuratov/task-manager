"use server";
import "server-only";
import { defineAction } from "./define-action";
import { taskActionSpecs as specs } from "./tasks.core";

export const createTask = defineAction(specs.createTask.schema, specs.createTask.handler, {
  revalidate: specs.createTask.revalidate,
});

export const updateTask = defineAction(specs.updateTask.schema, specs.updateTask.handler, {
  revalidate: specs.updateTask.revalidate,
});

export const setTaskStatus = defineAction(specs.setTaskStatus.schema, specs.setTaskStatus.handler, {
  revalidate: specs.setTaskStatus.revalidate,
});

export const deleteTask = defineAction(specs.deleteTask.schema, specs.deleteTask.handler, {
  revalidate: specs.deleteTask.revalidate,
});
