import type { Decorator, Preview } from "@storybook/nextjs-vite";
import "../src/app/globals.css";
import "./fonts.css";

// Sets the class on <html> (not a wrapper) so portalled menus and dialogs, rendered into <body>, are
// themed too; the body background comes from the same tokens. Stories that drive the theme themselves
// (ThemeToggle, via next-themes) opt out with `parameters.themeDecorator: false`.
const withTheme: Decorator = (Story, context) => {
  if (context.parameters.themeDecorator !== false) {
    document.documentElement.classList.toggle("dark", context.globals.theme === "dark");
  }
  return <Story />;
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: {
    a11y: {
      test: "error",
    },
  },
};

export default preview;
