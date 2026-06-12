/**
 * Deployment info — surfaces "what's live right now + what changed" in the admin
 * dashboard.
 *
 * Two data sources, by necessity:
 *   1. The LIVE headline (sha / message / branch) comes from Railway's injected
 *      `RAILWAY_GIT_*` runtime env vars. This is the only source that is correct
 *      in production: the Docker image excludes `.git` (see root `.dockerignore`)
 *      and the builder is `DOCKERFILE`, so `git log` returns nothing inside the
 *      container at build- or run-time.
 *   2. The RECENT-changes list comes from a committed JSON file
 *      (`deploymentChangelog.generated.json`) written by
 *      `scripts/generate-deployment-info.ts` during a LOCAL build, where `.git`
 *      exists. The generator no-ops when git is unavailable, so the committed
 *      file (baked into the image) is never blanked on Railway.
 *
 * All functions here are pure so they can be unit-tested without a real env or
 * git checkout.
 */

const FIELD_SEP = '\x1f'; // ASCII unit separator — safe inside commit subjects
const RECORD_SEP = '\x1e'; // ASCII record separator — git appends a newline too

/** git pretty-format used by both the generator script and the parser below. */
export const GIT_LOG_FORMAT = `%H${FIELD_SEP}%an${FIELD_SEP}%aI${FIELD_SEP}%s${RECORD_SEP}`;

export interface ChangelogCommit {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  date: string; // ISO 8601
}

export interface DeploymentChangelog {
  generatedAt: string; // ISO 8601 — when the committed file was generated
  commits: ChangelogCommit[];
}

export type DeploymentSource = 'railway' | 'changelog' | 'unknown';

export interface LatestDeployment {
  sha: string | null;
  shortSha: string | null;
  subject: string | null;
  author: string | null;
  branch: string | null;
  deploymentId: string | null;
  githubUrl: string | null;
  /** Process-start time, used as a proxy for "deployed at". */
  deployedAt: string | null;
  source: DeploymentSource;
}

export interface DeploymentInfo {
  latest: LatestDeployment;
  recent: ChangelogCommit[];
  builtAt: string | null;
}

type RailwayDeployment = Pick<
  LatestDeployment,
  'sha' | 'shortSha' | 'subject' | 'author' | 'branch' | 'deploymentId' | 'githubUrl'
>;

function clean(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Parse `git log --pretty=format:GIT_LOG_FORMAT` output into commit objects. */
export function parseGitLog(raw: string): ChangelogCommit[] {
  if (!raw) return [];
  return raw
    .split(RECORD_SEP)
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => {
      const [sha = '', author = '', date = '', subject = ''] = record.split(FIELD_SEP);
      const trimmedSha = sha.trim();
      return {
        sha: trimmedSha,
        shortSha: trimmedSha.slice(0, 7),
        subject: subject.trim(),
        author: author.trim(),
        date: date.trim(),
      };
    })
    .filter((commit) => commit.sha.length > 0);
}

/** Read Railway's injected git env vars into a typed, normalized shape. */
export function readRailwayDeployment(
  env: Record<string, string | undefined>,
): RailwayDeployment {
  const sha = clean(env.RAILWAY_GIT_COMMIT_SHA);
  const owner = clean(env.RAILWAY_GIT_REPO_OWNER);
  const repo = clean(env.RAILWAY_GIT_REPO_NAME);
  const githubUrl =
    sha && owner && repo ? `https://github.com/${owner}/${repo}/commit/${sha}` : null;

  return {
    sha,
    shortSha: sha ? sha.slice(0, 7) : null,
    subject: clean(env.RAILWAY_GIT_COMMIT_MESSAGE),
    author: clean(env.RAILWAY_GIT_AUTHOR),
    branch: clean(env.RAILWAY_GIT_BRANCH),
    deploymentId: clean(env.RAILWAY_DEPLOYMENT_ID),
    githubUrl,
  };
}

/**
 * Combine the live Railway env (authoritative headline) with the committed
 * changelog (recent history) into the shape the admin panel renders.
 *
 * @param nowMs     `Date.now()` at request time (omit in pure tests for null deployedAt)
 * @param uptimeSec `process.uptime()` — process start ≈ deploy time
 */
export function buildDeploymentInfo(
  env: Record<string, string | undefined>,
  changelog: DeploymentChangelog | null,
  nowMs?: number,
  uptimeSec?: number,
): DeploymentInfo {
  const railway = readRailwayDeployment(env);
  const recent = changelog?.commits ?? [];
  const newest = recent[0] ?? null;

  let deployedAt: string | null = null;
  if (typeof nowMs === 'number' && typeof uptimeSec === 'number' && uptimeSec >= 0) {
    deployedAt = new Date(nowMs - uptimeSec * 1000).toISOString();
  }

  let latest: LatestDeployment;
  if (railway.sha) {
    latest = { ...railway, deployedAt, source: 'railway' };
  } else if (newest) {
    latest = {
      sha: newest.sha,
      shortSha: newest.shortSha,
      subject: newest.subject,
      author: newest.author,
      branch: null,
      deploymentId: null,
      githubUrl: null,
      deployedAt: deployedAt ?? newest.date ?? null,
      source: 'changelog',
    };
  } else {
    latest = {
      sha: null,
      shortSha: null,
      subject: null,
      author: null,
      branch: null,
      deploymentId: null,
      githubUrl: null,
      deployedAt,
      source: 'unknown',
    };
  }

  return { latest, recent, builtAt: changelog?.generatedAt ?? null };
}
