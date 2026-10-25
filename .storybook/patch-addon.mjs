// scripts/ is gitignored (local agent workspace), so the non-ASCII-path patch exists only on machines that
// need it. Run it when present; a fresh clone skips it instead of failing check:full.
import { existsSync } from "node:fs";

const patch = new URL("../scripts/ci/patch-storybook-addon.mjs", import.meta.url);
if (existsSync(patch)) await import(patch.href);
