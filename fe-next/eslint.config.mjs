import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Every isolated build dir (NEXT_BUILD_DIR=.next-nightly, .next-perf,
    // .next-dev-verify, …). Without this, `npm run lint` scans 550+ minified
    // build chunks → bogus react/display-name + rules-of-hooks errors and a
    // ~36min lint → the gate fails forever. Globbed rather than listed one by
    // one: `.next-nightly` was enumerated here and `.next-perf` still broke lint
    // the moment another session used it.
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Python virtual environment (contains third-party JS from packages like gradio)
    ".venv/**",
    ".venv-rembg/**",
    // Android build artifacts
    "android/**",
    // Test coverage reports
    "coverage/**",
    "backend/coverage/**",
    // Production build output
    "dist/**",
    // Isolated standalone portal build — own package.json/tsconfig/eslint toolchain.
    "standalone/**",
  ]),
  {
    rules: {
      // Disable overly strict React hooks rules that flag legitimate patterns
      // like hydration mismatch prevention (setMounted in useEffect)
      // and data fetching (setState after async operations in effects)
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      // Prevent duplicate imports (caught build error)
      "no-duplicate-imports": "error",
    },
  },
]);

export default eslintConfig;
