# Pre-push hook

`.husky/pre-push` runs a fast, bounded gate before every push to `boggle-new`.

## Default behavior

By default the hook runs three checks in parallel:

1. **Lint** — only on changed `.ts/.tsx/.js/.jsx` files.
2. **Type check** — only when type-relevant files changed (`.ts/.tsx/.js/.jsx/.mjs/.cjs`, `tsconfig*.json`, `package.json`).
3. **Tests** — a small smoke subset (`shared/**/*.test.ts`, `lib/__tests__/**/*.test.ts`) plus any `.test/.spec` files that changed in the push. Changed tests are run directly, **without expanding their dependency cone**.

This keeps routine pushes fast. The previous hook resolved the full `--changed` dependency cone and could run for ~40 minutes; the default now targets seconds-to-a-minute.

## Available overrides

| Variable | Effect |
|----------|--------|
| `LEXI_PREPUSH_FULL=1` | Run the full test suite (`npm run test:full`) instead of the smoke + changed-tests subset. Use before a risky refactor or when you want CI-like coverage locally. |
| `LEXI_PREPUSH_NO_SMOKE=1` | Skip the smoke subset; only changed tests run. Faster still, but less safety on pushes that do not touch tests. |

Examples:

```bash
# default fast gate
 git push

# full local gate (~40 min)
LEXI_PREPUSH_FULL=1 git push

# skip smoke tests; only run tests whose files changed
LEXI_PREPUSH_NO_SMOKE=1 git push
```

## Running the full suite

The full test suite is available as a normal npm script and is **not** part of the default pre-push gate:

```bash
cd fe-next
npm run test:full   # backend + frontend
```

For CI or a thorough local check, use `npm run test:full`.

## What the hook blocks

The push is rejected if any of the following fail:

- Lint on changed files.
- Type check on type-relevant changes.
- Smoke tests.
- Any changed `.test/.spec` files.

## Troubleshooting

- **“Waiting for a concurrent pre-push test run…”** — a single-flight lock prevents two pre-push test runs from overlapping and OOMing the machine. Wait for the other run to finish, or remove a stale lock at `/tmp/lexi-prepush-test.lock` if the holder process is dead.
- **Smoke tests fail on master** — the smoke subset is meant to stay green. If it fails, fix the underlying tests; do not bypass the hook routinely. In an emergency, `git push --no-verify` is available but should be rare.
