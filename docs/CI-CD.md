# CI/CD Pipeline Documentation

This document describes the CI/CD pipeline setup for the LexiClash project.

## Overview

The pipeline consists of:
1. **GitHub Actions CI** - Runs on every push and PR
2. **Railway Deployments** - Preview deploys for PRs, production on merge
3. **Pre-push Hooks** - Local validation before pushing
4. **Branch Protection** - Requires CI to pass before merge

## Pipeline Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │              GitHub Actions CI               │
                    │                                              │
   Push/PR ───────► │  ┌─────────┐                                │
                    │  │ Install │                                │
                    │  └────┬────┘                                │
                    │       │                                      │
                    │  ┌────┴────┬─────────┐                      │
                    │  ▼         ▼         ▼                      │
                    │ Lint   Type-Check  Tests ───► Coverage      │
                    │  │         │         │                      │
                    │  └────┬────┴─────────┘                      │
                    │       ▼                                      │
                    │    Build                                     │
                    │       │                                      │
                    │       ▼                                      │
                    │  ci-success (summary job)                    │
                    └──────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Railway Deploy     │
                    │                      │
                    │  PR → Preview env    │
                    │  Merge → Production  │
                    └──────────────────────┘
```

## Required Secrets

Set these in GitHub repository settings → Secrets and variables → Actions:

| Secret | Description | Required |
|--------|-------------|----------|
| `RAILWAY_TOKEN` | Railway API token from [railway.app/account](https://railway.app/account/tokens) | Yes |
| `CODECOV_TOKEN` | Token from [codecov.io](https://codecov.io) | Optional (for coverage) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |

### Getting Railway Token

1. Go to [railway.app/account/tokens](https://railway.app/account/tokens)
2. Create a new token with a descriptive name (e.g., "GitHub Actions")
3. Copy the token and add it as `RAILWAY_TOKEN` secret in GitHub

## Railway Runtime Environment Variables

These are set **on the Railway service** (Variables tab), NOT as GitHub Actions
secrets — they are read at runtime by the running app, not at build/deploy time.
Missing any of them makes `/api/checkout` return `{"error":"Checkout failed"}`
(the real cause — e.g. `LEMONSQUEEZY_API_KEY is not configured` — is logged
server-side, not returned to the client).

| Variable | Description | Consumed by |
|----------|-------------|-------------|
| `LEMONSQUEEZY_API_KEY` | Lemon Squeezy API key (secret) | `lib/lemonsqueezy.ts` — checkout |
| `LEMONSQUEEZY_STORE_ID` | Store ID (`429079`) | `lib/lemonsqueezy.ts` — checkout |
| `LEMONSQUEEZY_VARIANT_ID_PRO` | Teacher Pro variant ID (`1910376`) | `lib/lemonsqueezy.ts` — checkout |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Webhook signing secret (secret) | `app/api/webhook/lemonsqueezy/route.ts` |

The webhook (ID `119176`) points to
`https://www.lexiclash.live/api/webhook/lemonsqueezy`; its signing secret must
match `LEMONSQUEEZY_WEBHOOK_SECRET` or signature validation fails closed.

## Branch Protection Rules

To enforce CI passing before merge:

1. Go to **Settings → Branches → Branch protection rules**
2. Click **Add rule**
3. Set **Branch name pattern**: `master` (or `main`)
4. Enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
5. Select required status checks:
   - `ci-success` (this is the summary job that only passes if all checks pass)
6. Optionally enable:
   - ✅ **Require conversation resolution before merging**
   - ✅ **Do not allow bypassing the above settings**

## Pre-push Hooks

Local validation runs before every push:

1. **Lint** - ESLint checks
2. **Type check** - TypeScript compilation
3. **Tests** - Jest unit tests

To skip hooks in emergencies (not recommended):
```bash
git push --no-verify
```

### Setup for New Developers

Husky is configured to auto-install via `npm install`. If hooks aren't working:
```bash
npm run prepare  # Re-initialize husky
```

## Railway Preview Environments

PRs automatically get a preview deployment:

1. When a PR is opened/updated, a preview env is created (`pr-{number}`)
2. A comment is posted on the PR with the preview URL
3. When the PR is closed/merged, the preview env is deleted

Preview environments use the same Railway project but with isolated resources.

### Search Engine Blocking

Preview environments are automatically blocked from search engine indexing via multiple layers:

1. **robots.txt** - Returns `Disallow: /` for all crawlers
2. **Meta tags** - `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">`
3. **HTTP header** - `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, noimageindex`

This is controlled by:
- `NEXT_PUBLIC_IS_PREVIEW=true` - Explicitly set for preview deployments
- `RAILWAY_ENVIRONMENT_NAME` starting with `pr-` - Auto-detected for PR previews

**Production stays indexed** - The check only blocks indexing when explicitly set or when the environment is a PR preview. Normal production deployments are not affected.

## Codecov Coverage

Coverage reports are uploaded to Codecov on every test run.

### Setup

1. Go to [codecov.io](https://codecov.io) and connect your GitHub repo
2. Get the upload token from the repo settings
3. Add it as `CODECOV_TOKEN` secret in GitHub

### Coverage in PRs

Codecov will automatically:
- Comment on PRs with coverage changes
- Block PRs if coverage drops below threshold (configurable in `codecov.yml`)

## Workflow Files

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | Main CI pipeline (lint, type-check, test, build) |
| `.github/workflows/railway-deploy.yml` | Railway preview/production deploys |
| `.github/workflows/ci-failure-assistant.yml` | AI-assisted failure analysis |
| `.github/workflows/supabase-migrations.yml` | Database migrations |
| `.github/copilot-review.yml` | Copilot code review configuration |
| `.husky/pre-push` | Local pre-push validation |
| `.husky/pre-commit` | Translation check on commit |
| `railway.json` | Railway build configuration |
| `nixpacks.toml` | Nixpacks build settings |

## AI-Assisted Debugging

### GitHub Copilot Integration

The pipeline integrates with GitHub Copilot for automatic error analysis and fixes:

#### Automatic Failure Analysis

When CI fails, the `ci-failure-assistant.yml` workflow:
1. Captures the error logs from failed jobs
2. Posts a detailed analysis comment on the PR
3. Creates an issue for push failures (if not a PR)
4. Provides quick-fix suggestions

#### Using Copilot to Fix Failures

**In PR comments:**
- Type `@github How do I fix this CI failure?` to get Copilot's analysis

**In VS Code:**
1. Open the failing file
2. Open Copilot Chat (Cmd+Shift+I / Ctrl+Shift+I)
3. Paste the error and ask for a fix

**In GitHub Web:**
1. Open the failing workflow run
2. Click the Copilot icon
3. Ask "What caused this failure and how do I fix it?"

#### Copilot Code Review

PRs are automatically reviewed by Copilot (configured in `.github/copilot-review.yml`):
- Security issues
- Bug detection
- Performance suggestions
- Best practices

### Enabling Copilot Features

1. Go to **Settings → Copilot → Code review**
2. Enable "Automatically request reviews from Copilot"
3. Set review preferences

## Troubleshooting

### CI is slow
- Check if cache is being restored (look for "Cache restored" in logs)
- Update `CACHE_PREFIX` in ci.yml to invalidate cache if corrupted

### Preview deploy fails
- Verify `RAILWAY_TOKEN` is valid
- Check Railway dashboard for deployment errors
- Ensure Railway project is linked correctly

### Pre-push hook not running
- Run `npm run prepare` from the root directory
- Check that `.husky/pre-push` is executable

### Tests pass locally but fail in CI
- CI uses `--ci` flag which runs tests in different mode
- Check for environment-specific code paths
- Ensure all test mocks are properly configured
