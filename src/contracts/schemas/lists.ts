import { z } from "zod";
import { INVALID_SUBMISSION, listIdSchema, trimmedText } from "./common";

export const listNameSchema = trimmedText("Name", 80);

export const createListSchema = z.object({ name: listNameSchema }, { error: INVALID_SUBMISSION });
export const renameListSchema = z.object({ id: listIdSchema, name: listNameSchema }, { error: INVALID_SUBMISSION });
export const deleteListSchema = z.object({ id: listIdSchema }, { error: INVALID_SUBMISSION });

export type ListNameInput = z.input<typeof listNameSchema>;
export type ListNameOutput = z.output<typeof listNameSchema>;
export type CreateListInput = z.input<typeof createListSchema>;
export type CreateListOutput = z.output<typeof createListSchema>;
export type RenameListInput = z.input<typeof renameListSchema>;
export type RenameListOutput = z.output<typeof renameListSchema>;
export type DeleteListInput = z.input<typeof deleteListSchema>;
export type DeleteListOutput = z.output<typeof deleteListSchema>;
