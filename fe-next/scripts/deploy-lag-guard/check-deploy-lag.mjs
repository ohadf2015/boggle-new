#!/usr/bin/env node
/**
 * Deploy-lag guard (ALERT-ONLY — never redeploys, never writes to prod).
 *
 * Compares the newest green commit on the default branch against what prod
 * is actually serving, and opens (or updates) ONE GitHub issue labelled
 * `deploy-lag` when prod is more than GUARD_THRESHOLD_MINUTES behind.
 * Closes that issue once prod catches up. Idempotent: at most one open
 * alert at a time.
 *
 * REUSE IN ANOTHER REPO: copy this file + the deploy-lag-guard workflow and
 * set the env below. Nothing here is LexiClash-specific beyond the defaults.
 *
 * Env:
 *   GITHUB_TOKEN            (required) token with issues:write on GUARD_REPO
 *   GUARD_REPO              owner/name (default: GITHUB_REPOSITORY)
 *   GUARD_BRANCH            default branch (default: master)
 *   GUARD_VERSION_URL       prod /api/version (default: https://www.lexiclash.live/api/version)
 *   GUARD_HEALTH_URL        prod /api/health  (default: https://www.lexiclash.live/api/health)
 *   GUARD_THRESHOLD_MINUTES lag before alerting (default: 120)
 *   GUARD_ISSUE_LABEL       issue label (default: deploy-lag)
 *   GUARD_DRY_RUN           "1" = log decisions, no issue writes
 */

import { pathToFileURL } from 'node:url';

const SHA_RE = /^[0-9a-f]{7,40}$/i;

/** commits: [{ sha, date, state }] newest first; state = combined status ('success' | 'failure' | 'pending' | null). */
export function pickNewestGreen(commits) {
  return (
    commits.find((c) => c.state === 'success' || c.state === null) || null
  );
}

/**
 * Decide whether prod is behind and by how much.
 * basis 'sha' when both commits are known to the repo, else 'buildTime'.
 * Prod ahead of (or equal to) the green commit is never "behind".
 */
export function computeLag({
  greenSha,
  greenDate,
  prodSha,
  prodDate,
  prodBuildTime,
}) {
  if (!greenDate) return { behind: false, basis: 'none', lagMinutes: 0 };
  const greenMs = Date.parse(greenDate);

  if (prodSha && prodSha === greenSha) {
    return { behind: false, basis: 'sha', lagMinutes: 0 };
  }
  if (prodSha && prodDate) {
    const lag = greenMs - Date.parse(prodDate);
    return lag <= 0
      ? { behind: false, basis: 'sha', lagMinutes: 0 }
      : { behind: true, basis: 'sha', lagMinutes: lag / 60000 };
  }
  if (prodBuildTime) {
    const lag = greenMs - Date.parse(prodBuildTime);
    return lag <= 0
      ? { behind: false, basis: 'buildTime', lagMinutes: 0 }
      : { behind: true, basis: 'buildTime', lagMinutes: lag / 60000 };
  }
  return { behind: false, basis: 'none', lagMinutes: 0 };
}

export function buildIssueBody({
  repo,
  branch,
  prodSha,
  greenSha,
  greenDate,
  lagMinutes,
  basis,
  versionUrl,
  healthUrl,
}) {
  return [
    `Prod is **${Math.round(lagMinutes)} min** behind \`${branch}\` (basis: ${basis}).`,
    '',
    `- repo: \`${repo}\``,
    `- prod serves: \`${prodSha || 'unknown'}\` (via ${versionUrl} / ${healthUrl})`,
    `- newest green ${branch} commit: \`${greenSha}\` (${greenDate})`,
    '',
    'The guard only alerts — it never redeploys. Check the host (Railway) deploy pipeline, then close this issue or let the guard auto-close it once prod catches up.',
  ].join('\n');
}

const realIo = {
  async github(token, path, { method = 'GET', body } = {}) {
    const res = await fetch(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try {
      json = await res.json();
    } catch {
      /* empty body */
    }
    return { status: res.status, json };
  },
  async getJson(url, attempts = 2) {
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await fetch(url, {
          headers: { 'Cache-Control': 'no-cache' },
          signal: AbortSignal.timeout(15000),
        });
        if (res.ok) return { ok: true, json: await res.json() };
      } catch {
        /* retry */
      }
    }
    return { ok: false, json: null };
  },
  log: (...args) => console.log(...args),
};

async function fetchJsonIfOk(io, token, path) {
  const { status, json } = await io.github(token, path);
  return status === 200 && json ? json : null;
}

async function ensureLabel(io, token, repo, label, dryRun, log) {
  if (dryRun) return;
  const { status } = await io.github(token, `/repos/${repo}/labels`, {
    method: 'POST',
    body: { name: label, color: 'e11d48', description: 'Prod deploy lag alert (auto-managed)' },
  });
  if (status !== 201 && status !== 422) {
    log(`warn: label create returned ${status}`);
  }
}

/**
 * Greenness of one commit: legacy commit statuses AND GitHub Actions check
 * runs (the /status rollup ignores check runs on some plans). Returns
 * 'success' | 'failure' | 'pending' | null (no CI attached at all — treat
 * as green, some repos push without CI).
 */
export async function commitState(io, token, repo, sha) {
  const [status, checks] = await Promise.all([
    fetchJsonIfOk(io, token, `/repos/${repo}/commits/${sha}/status`),
    fetchJsonIfOk(io, token, `/repos/${repo}/commits/${sha}/check-runs?per_page=100`),
  ]);
  const statuses = status?.statuses || [];
  const runs = checks?.check_runs || [];
  if (statuses.length === 0 && runs.length === 0) return null;
  if (statuses.some((s) => s.state === 'pending') || runs.some((r) => r.status !== 'completed')) {
    return 'pending';
  }
  const bad =
    statuses.some((s) => s.state !== 'success') ||
    runs.some((r) => !['success', 'neutral', 'skipped'].includes(r.conclusion));
  return bad ? 'failure' : 'success';
}

async function listOpenAlerts(io, token, repo, label) {
  const json = await fetchJsonIfOk(
    io,
    token,
    `/repos/${repo}/issues?state=open&labels=${encodeURIComponent(label)}&per_page=10`,
  );
  return (json || []).filter((i) => !i.pull_request);
}

async function closeAlerts(io, token, repo, issues, note, dryRun, log) {
  for (const issue of issues) {
    log(`closing #${issue.number}: ${note}`);
    if (dryRun) continue;
    await io.github(token, `/repos/${repo}/issues/${issue.number}/comments`, {
      method: 'POST',
      body: { body: note },
    });
    await io.github(token, `/repos/${repo}/issues/${issue.number}`, {
      method: 'PATCH',
      body: { state: 'closed' },
    });
  }
}

async function openOrUpdateAlert(io, token, repo, label, issues, title, body, dryRun, log) {
  if (dryRun) {
    log(`dry-run: would alert — ${title}`);
    return;
  }
  await ensureLabel(io, token, repo, label, dryRun, log);
  if (issues.length === 0) {
    const { status, json } = await io.github(token, `/repos/${repo}/issues`, {
      method: 'POST',
      body: { title, body, labels: [label] },
    });
    log(status === 201 ? `opened issue #${json?.number}` : `error: issue create returned ${status}`);
  } else {
    log(`updating existing issue #${issues[0].number}`);
    await io.github(token, `/repos/${repo}/issues/${issues[0].number}/comments`, {
      method: 'POST',
      body: { body: `Still lagging.\n\n${body}` },
    });
  }
}

export async function run(env, io = realIo) {
  const log = io.log || (() => {});
  const token = env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required');
  const repo = env.GUARD_REPO || env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GUARD_REPO (or GITHUB_REPOSITORY) is required');
  const branch = env.GUARD_BRANCH || 'master';
  const versionUrl = env.GUARD_VERSION_URL || 'https://www.lexiclash.live/api/version';
  const healthUrl = env.GUARD_HEALTH_URL || 'https://www.lexiclash.live/api/health';
  const thresholdMin = Number(env.GUARD_THRESHOLD_MINUTES || 120);
  const label = env.GUARD_ISSUE_LABEL || 'deploy-lag';
  const dryRun = env.GUARD_DRY_RUN === '1';

  const head = await fetchJsonIfOk(io, token, `/repos/${repo}/commits/${branch}`);
  if (!head?.sha) throw new Error(`cannot read ${repo}@${branch}`);
  const headSha = head.sha;
  const headDate = head.commit?.committer?.date;
  log(`master head: ${headSha.slice(0, 9)} @ ${headDate}`);

  const [version, health] = await Promise.all([
    io.getJson(versionUrl),
    io.getJson(healthUrl),
  ]);
  const rawProdSha = version.json?.commit || health.json?.commit || null;
  const prodSha = rawProdSha && SHA_RE.test(rawProdSha) ? rawProdSha : null;
  const prodBuildTime = version.json?.buildTime || null;
  if (!version.ok && !health.ok) {
    log(`warn: prod endpoints unreachable (${versionUrl}, ${healthUrl}) — skipping; keep-alive covers downtime`);
    return { action: 'skip-unreachable' };
  }
  log(`prod: sha=${prodSha ? prodSha.slice(0, 9) : 'unknown'} buildTime=${prodBuildTime}`);

  const openAlerts = await listOpenAlerts(io, token, repo, label);

  // Newest green commit: walk back from head, skipping red commits so a
  // broken build doesn't masquerade as a deploy stall. `pending` commits
  // are ignored (too early to judge) rather than treated as green.
  const recent =
    (await fetchJsonIfOk(io, token, `/repos/${repo}/commits?sha=${branch}&per_page=10`)) || [];
  const withStatus = [];
  for (const c of recent) {
    const state = await commitState(io, token, repo, c.sha);
    withStatus.push({ sha: c.sha, date: c.commit?.committer?.date, state });
    if (state === 'success' || state === null) break; // newest green found
  }
  const green = pickNewestGreen(withStatus);
  if (!green) {
    log('no green commit in the last 10 — nothing safe to compare against');
    return { action: 'skip-no-green' };
  }
  log(`newest green: ${green.sha.slice(0, 9)} @ ${green.date} (state=${green.state ?? 'no-statuses'})`);

  let prodDate = null;
  if (prodSha && prodSha !== green.sha) {
    const prodCommit = await fetchJsonIfOk(io, token, `/repos/${repo}/commits/${prodSha}`);
    prodDate = prodCommit?.commit?.committer?.date || null;
  }

  const lag = computeLag({
    greenSha: green.sha,
    greenDate: green.date,
    prodSha,
    prodDate,
    prodBuildTime,
  });
  log(`lag: ${Math.round(lag.lagMinutes)} min (basis=${lag.basis}, behind=${lag.behind}, threshold=${thresholdMin})`);

  if (!lag.behind || lag.lagMinutes <= thresholdMin) {
    if (openAlerts.length > 0) {
      await closeAlerts(
        io, token, repo, openAlerts,
        `Prod caught up: serving \`${prodSha || prodBuildTime}\`, newest green ${branch} is \`${green.sha}\`. Auto-closing.`,
        dryRun, log,
      );
      return { action: 'closed', lag };
    }
    return { action: 'ok', lag };
  }

  const body = buildIssueBody({
    repo, branch, prodSha, greenSha: green.sha, greenDate: green.date,
    lagMinutes: lag.lagMinutes, basis: lag.basis, versionUrl, healthUrl,
  });
  const title = `[deploy-lag] prod is ${Math.round(lag.lagMinutes)} min behind ${branch}`;
  await openOrUpdateAlert(io, token, repo, label, openAlerts, title, body, dryRun, log);
  return { action: openAlerts.length ? 'updated' : 'opened', lag };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  run(process.env)
    .then((r) => console.log(`deploy-lag guard: ${JSON.stringify(r)}`))
    .catch((err) => {
      console.error(`deploy-lag guard failed: ${err.message}`);
      process.exit(1);
    });
}
