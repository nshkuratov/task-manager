"use server";
import "server-only";
import { defineAction } from "./define-action";
import { listActionSpecs as specs } from "./lists.core";

export const createList = defineAction(specs.createList.schema, specs.createList.handler, {
  revalidate: specs.createList.revalidate,
});

export const renameList = defineAction(specs.renameList.schema, specs.renameList.handler, {
  revalidate: specs.renameList.revalidate,
});

export const deleteList = defineAction(specs.deleteList.schema, specs.deleteList.handler, {
  revalidate: specs.deleteList.revalidate,
});
