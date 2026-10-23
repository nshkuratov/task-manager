import { createRequire } from "node:module";
import path from "node:path";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import storybook from "eslint-plugin-storybook";
import tseslint from "typescript-eslint";

// Resolve the plugins and resolver eslint-config-next registers from its own location, so this config
// adds rules to exactly those instances instead of depending on npm's hoisting.
const fromNextConfig = createRequire(createRequire(import.meta.url).resolve("eslint-config-next"));
const jsxA11y = fromNextConfig("eslint-plugin-jsx-a11y");
const typescriptResolver = fromNextConfig.resolve("eslint-import-resolver-typescript");

const DATA_DIRS = ["src/app", "src/server/actions", "src/server/queries", "src/server/auth"];
const DATA_FILES = ["src/proxy.ts", "src/server/session-user.ts"];
const PURE_DIRS = ["src/components", "src/contracts", "src/domain", "src/lib"];

const dirGlobs = (dirs, suffix = "") => dirs.map((dir) => `${dir}/**${suffix}`);

const SHARED_BAN = {
  regex: "^(@/server|@/app|drizzle-orm|@libsql|server-only)(/|$)",
  message: "Components, contracts, domain, lib and stories get data as props; only src/server touches the DB.",
};
const CONTRACTS_ALLOWLIST = "zod$|zod/|@/contracts(/|$)|\\.";
const REPOSITORY_ONLY = "Reach data through @/server/repositories; only the repository layer touches Drizzle/libSQL.";

function restrictImports(...patterns) {
  return { "no-restricted-imports": ["error", { patterns }] };
}

function contractsOnly(message, extra = []) {
  return { regex: `^(?!${[...extra, CONTRACTS_ALLOWLIST].join("|")})`, message };
}

// One zone list for every block that sets the rule: a later block replaces the options of an earlier one.
function zones({ allowTestingHelper }) {
  return [
    {
      target: [...DATA_DIRS, ...DATA_FILES, ...PURE_DIRS],
      from: "src/server/db",
      ...(allowTestingHelper ? { except: ["./testing.ts"] } : {}),
      message: REPOSITORY_ONLY,
    },
    {
      target: PURE_DIRS,
      from: "src/server",
      message: "Components, contracts, domain and lib must not import server modules.",
    },
  ];
}

/**
 * Builds the project's flat config against `root`. The default export uses the repository root; the
 * lint-boundary test points `root` at a fixture tree and passes `typeAware: false`, so it exercises these
 * exact rules without needing the fixtures in the TypeScript project.
 */
export function createConfig({ root, typeAware }) {
  return defineConfig([
    ...nextVitals,
    ...nextTs,
    {
      rules: jsxA11y.flatConfigs.recommended.rules,
      settings: {
        "import/resolver": {
          [typescriptResolver]: { alwaysTryTypes: true, project: path.join(root, "tsconfig.json") },
        },
      },
    },
    {
      files: ["**/*.{ts,tsx,mts}"],
      languageOptions: { parser: tseslint.parser },
      rules: {
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/consistent-type-imports": "error",
      },
    },
    ...(typeAware
      ? [
          {
            files: ["**/*.{ts,tsx,mts}"],
            languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: root } },
            rules: {
              "@typescript-eslint/no-floating-promises": "error",
              "@typescript-eslint/no-misused-promises": "error",
            },
          },
        ]
      : []),
    ...storybook.configs["flat/recommended"],

    {
      rules: {
        "import/no-restricted-paths": ["error", { basePath: root, zones: zones({ allowTestingHelper: false }) }],
      },
    },
    {
      files: ["**/*.test.ts"],
      rules: {
        "import/no-restricted-paths": ["error", { basePath: root, zones: zones({ allowTestingHelper: true }) }],
      },
    },

    {
      files: [...dirGlobs(["src/components", "src/lib"]), "**/*.stories.tsx"],
      rules: restrictImports(SHARED_BAN),
    },
    {
      files: dirGlobs(["src/contracts"]),
      rules: restrictImports(SHARED_BAN, contractsOnly("Contracts may import only zod and other contracts.")),
    },
    {
      files: dirGlobs(["src/contracts"], "/*.test.ts"),
      rules: restrictImports(
        SHARED_BAN,
        contractsOnly("Contracts tests may import only zod, other contracts and vitest.", ["vitest$"]),
      ),
    },
    {
      files: dirGlobs(["src/domain"]),
      rules: {
        ...restrictImports(
          SHARED_BAN,
          { regex: "^(react|next)([-/]|$)", message: "Domain rules are framework-free." },
          { regex: "^(@/components|zod)(/|$)", message: "Domain rules take plain data, not components or schemas." },
          {
            regex: "^(@/contracts(/index)?|(\\.\\./)+contracts(/index)?|@/contracts/schemas(/.*)?)$",
            message: "Domain may import only @/contracts/task (types), not the barrel or the schemas.",
          },
        ),
        "no-restricted-syntax": [
          "error",
          {
            selector: "NewExpression[callee.name='Date'][arguments.length=0]",
            message: "Domain functions take `now` as a parameter; never read the clock.",
          },
          {
            selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
            message: "Domain functions take `now` as a parameter; never read the clock.",
          },
        ],
      },
    },
    {
      files: [...dirGlobs(DATA_DIRS), ...DATA_FILES],
      ignores: ["**/*.test.ts"],
      rules: restrictImports({ regex: "^(drizzle-orm|@libsql|@/server/db)(/|$)", message: REPOSITORY_ONLY }),
    },
    {
      files: dirGlobs(DATA_DIRS, "/*.test.ts"),
      rules: restrictImports({
        regex: "^(drizzle-orm|@libsql|@/server/db(?!/testing$))(/|$)",
        message: REPOSITORY_ONLY,
      }),
    },

    globalIgnores([
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "storybook-static/**",
      "coverage/**",
      "test-results/**",
      "playwright-report/**",
      "src/test/fixtures/**",
    ]),
    prettier,
  ]);
}

export default createConfig({ root: import.meta.dirname, typeAware: true });
