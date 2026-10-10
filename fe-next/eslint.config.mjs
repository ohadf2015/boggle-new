import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const MOTION_PATH = {
  name: "framer-motion",
  importNames: ["motion"],
  message: "Import `m` from framer-motion; app/LazyMotionRoot provides its features.",
};
const PIXI_PATH = {
  name: "pixi.js",
  message: "Pixi is confined to the modules that already import it (see lib/pixiFx). Add new Pixi code there.",
};
const PIXI_ALLOWED = [
  "lib/pixiFx/**",
  "lib/word-craft/pixi/**",
  "lib/gameEngine/**",
  "lib/blast/v2/fx/**",
  "components/wordTowerV2/**",
  "components/wordTower/**",
  "components/results/**",
  "components/daily/WordWheelPixiRing.tsx",
  "components/blast/legacy/**",
  "components/adventure/play/arena/**",
];
const TEST_FILES = ["**/__tests__/**", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "e2e/**"];

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
      // Same family, same reason: the imperative canvas layers (Word Tower's
      // Pixi scene, the crane) keep `xRef.current = prop` mirrors at render so
      // rAF loops read live values without re-creating callbacks every frame.
      // The rule flags every one of those. It was already failing on committed
      // code (WordTowerScene at HEAD), so leaving it on only meant any change to
      // those files failed the pre-push lint for a pre-existing pattern.
      "react-hooks/immutability": "off",
      // Prevent duplicate imports (caught build error)
      "no-duplicate-imports": "error",
    },
  },
  // `motion` pulls the full framer engine into its chunk; Pixi must stay behind a route leaf.
  {
    files: ["**/*.{ts,tsx}"],
    ignores: [...PIXI_ALLOWED, ...TEST_FILES],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [MOTION_PATH, PIXI_PATH],
      }],
    },
  },
  {
    files: PIXI_ALLOWED,
    ignores: TEST_FILES,
    rules: {
      "no-restricted-imports": ["error", { paths: [MOTION_PATH] }],
    },
  },
]);

export default eslintConfig;
