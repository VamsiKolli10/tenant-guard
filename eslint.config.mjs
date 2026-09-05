import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // `src/server/services/*` holds the raw domain functions. They accept
    // `orgId` and `actorRole` as plain arguments and trust them, so they are
    // safe only behind the guards in `src/services/*`, which resolve
    // membership first. Routes and components must go through that facade.
    files: ["src/app/**", "src/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // `users` is exempt: account creation has no tenant dimension and
              // legitimately runs before any membership exists.
              group: [
                "@/server/services/tasks",
                "@/server/services/memberships",
                "@/server/services/invitations",
                "@/server/services/organizations",
                "@/server/services/audit",
                "@/server/services/tenancy",
                "**/server/services/tasks",
                "**/server/services/memberships",
                "**/server/services/invitations",
                "**/server/services/organizations",
                "**/server/services/audit",
                "**/server/services/tenancy",
              ],
              message:
                "Import the guarded facade in @/services/* instead. The raw layer in @/server/services/* performs no membership check.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
