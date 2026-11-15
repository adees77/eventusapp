import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Layering: UI reads data only through lib/data/views (one hook per screen) and writes through
    // lib/data/actions. That keeps every query in one place for the move to Supabase.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["components/layout/app-shell.tsx", "components/layout/settings-menu.tsx", "app/admin/settings/page.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/data/store",
              message: "Read data through a hook in @/lib/data/views/*, write through @/lib/data/actions.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // other Claude Code sessions' checkouts
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
