import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Nightly loop's isolated build dir (NEXT_BUILD_DIR=.next-nightly). Without
    // this, `npm run lint` scans 550+ minified build chunks → bogus
    // react/display-name errors + ~36min lint → the nightly gate fails forever.
    ".next-nightly/**",
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
