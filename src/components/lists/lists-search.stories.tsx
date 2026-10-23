import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { ListsSearch } from "./lists-search";

const meta = {
  title: "Lists/ListsSearch",
  component: ListsSearch,
  args: { onQueryChange: fn() },
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/lists" } } },
} satisfies Meta<typeof ListsSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

const searchbox = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole("searchbox", { name: "Search lists" });

export const Typing: Story = {
  name: "R-LIST-8, R-TEST-1: typing reports the query once after the debounce; Escape clears it",
  play: async ({ args, canvasElement }) => {
    const input = searchbox(canvasElement);
    await userEvent.type(input, "groc");
    await expect(args.onQueryChange).not.toHaveBeenCalled();
    await waitFor(() => expect(args.onQueryChange).toHaveBeenCalledWith("groc"));
    await expect(args.onQueryChange).toHaveBeenCalledOnce();

    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveValue("");
    await expect(args.onQueryChange).toHaveBeenLastCalledWith("");
    await expect(args.onQueryChange).toHaveBeenCalledTimes(2);
  },
};

export const Trims: Story = {
  name: "R-LIST-8: surrounding spaces are not part of the query, and a space alone sends nothing new",
  play: async ({ args, canvasElement }) => {
    const input = searchbox(canvasElement);
    await userEvent.type(input, "  home ");
    await waitFor(() => expect(args.onQueryChange).toHaveBeenCalledWith("home"));
    await userEvent.type(input, " ");
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(args.onQueryChange).toHaveBeenCalledOnce();
  },
};

export const UpdatesUrl: Story = {
  name: "R-LIST-8: without an override the query replaces ?q= in the URL, and clearing removes it",
  render: () => <ListsSearch />,
  play: async ({ canvasElement }) => {
    const input = searchbox(canvasElement);
    await userEvent.type(input, "Покупки");
    await waitFor(() =>
      expect(getRouter().replace).toHaveBeenLastCalledWith(`/lists?q=${encodeURIComponent("Покупки")}`, {
        scroll: false,
      }),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(getRouter().replace).toHaveBeenLastCalledWith("/lists", { scroll: false }));
  },
};

export const StartsFromUrl: Story = {
  name: "R-LIST-8: a shared or reloaded ?q= fills the box",
  parameters: { nextjs: { appDirectory: true, navigation: { pathname: "/lists", query: { q: "home" } } } },
  play: async ({ args, canvasElement }) => {
    await expect(searchbox(canvasElement)).toHaveValue("home");
    await new Promise((resolve) => setTimeout(resolve, 400));
    await expect(args.onQueryChange).not.toHaveBeenCalled();
  },
};

export const Dark: Story = {
  name: "Search box in the dark theme",
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    await expect(document.documentElement).toHaveClass("dark");
    await expect(searchbox(canvasElement)).toBeVisible();
  },
};
