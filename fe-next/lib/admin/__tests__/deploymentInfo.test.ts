import { describe, it, expect } from 'vitest';
import {
  parseGitLog,
  readRailwayDeployment,
  buildDeploymentInfo,
  GIT_LOG_FORMAT,
  type DeploymentChangelog,
} from '../deploymentInfo';

const FS = '\x1f'; // field separator
const RS = '\x1e'; // record separator

function rawLog(records: Array<[string, string, string, string]>): string {
  // Mirrors `git log --pretty=format:GIT_LOG_FORMAT`: each record ends with RS,
  // and git joins records with a newline.
  return records.map(([h, an, ai, s]) => `${h}${FS}${an}${FS}${ai}${FS}${s}${RS}`).join('\n');
}

const SAMPLE_CHANGELOG: DeploymentChangelog = {
  generatedAt: '2026-06-12T10:00:00.000Z',
  commits: [
    {
      sha: 'fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      shortSha: 'fb84250',
      subject: 'perf(blast): skip the always-on Pixi FX overlay on low-end devices',
      author: 'Ohad Fisher',
      date: '2026-06-12T09:00:00.000Z',
    },
    {
      sha: 'c4e447c2fbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      shortSha: 'c4e447c',
      subject: 'fix(blast): repair stranded blank tiles at gravity chokepoint',
      author: 'Ohad Fisher',
      date: '2026-06-12T08:00:00.000Z',
    },
  ],
};

describe('GIT_LOG_FORMAT', () => {
  it('uses unit/record separators so commit subjects with commas survive', () => {
    expect(GIT_LOG_FORMAT).toContain('%H');
    expect(GIT_LOG_FORMAT).toContain('%an');
    expect(GIT_LOG_FORMAT).toContain('%aI');
    expect(GIT_LOG_FORMAT).toContain('%s');
    expect(GIT_LOG_FORMAT).toContain(FS);
    expect(GIT_LOG_FORMAT).toContain(RS);
  });
});

describe('parseGitLog', () => {
  it('returns [] for empty input', () => {
    expect(parseGitLog('')).toEqual([]);
    expect(parseGitLog('   \n  ')).toEqual([]);
  });

  it('parses multiple records and derives a 7-char short sha', () => {
    const raw = rawLog([
      ['fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'Ohad Fisher', '2026-06-12T09:00:00.000Z', 'perf(blast): skip overlay'],
      ['c4e447c2fbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'Ohad Fisher', '2026-06-12T08:00:00.000Z', 'fix(blast): repair tiles'],
    ]);
    const commits = parseGitLog(raw);
    expect(commits).toHaveLength(2);
    expect(commits[0]).toEqual({
      sha: 'fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      shortSha: 'fb84250',
      subject: 'perf(blast): skip overlay',
      author: 'Ohad Fisher',
      date: '2026-06-12T09:00:00.000Z',
    });
    expect(commits[1].shortSha).toBe('c4e447c');
  });

  it('preserves commas and parentheses in the subject', () => {
    const raw = rawLog([
      ['abc1234def', 'A', '2026-06-12T09:00:00.000Z', 'feat(x): a, b, and c (with parens)'],
    ]);
    expect(parseGitLog(raw)[0].subject).toBe('feat(x): a, b, and c (with parens)');
  });

  it('drops records with no sha', () => {
    const raw = `${FS}A${FS}2026${FS}empty${RS}`;
    expect(parseGitLog(raw)).toEqual([]);
  });
});

describe('readRailwayDeployment', () => {
  it('maps the standard RAILWAY_GIT_* env vars', () => {
    const out = readRailwayDeployment({
      RAILWAY_GIT_COMMIT_SHA: 'fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      RAILWAY_GIT_COMMIT_MESSAGE: 'perf(blast): skip overlay',
      RAILWAY_GIT_AUTHOR: 'Ohad Fisher',
      RAILWAY_GIT_BRANCH: 'master',
      RAILWAY_DEPLOYMENT_ID: 'dep-123',
      RAILWAY_GIT_REPO_OWNER: 'ohadf',
      RAILWAY_GIT_REPO_NAME: 'boggle-new',
    });
    expect(out.sha).toBe('fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(out.shortSha).toBe('fb84250');
    expect(out.subject).toBe('perf(blast): skip overlay');
    expect(out.author).toBe('Ohad Fisher');
    expect(out.branch).toBe('master');
    expect(out.deploymentId).toBe('dep-123');
    expect(out.githubUrl).toBe(
      'https://github.com/ohadf/boggle-new/commit/fb8425080aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
  });

  it('returns nulls for missing vars and a null githubUrl without owner/repo', () => {
    const out = readRailwayDeployment({
      RAILWAY_GIT_COMMIT_SHA: 'abc1234',
    });
    expect(out.shortSha).toBe('abc1234');
    expect(out.subject).toBeNull();
    expect(out.author).toBeNull();
    expect(out.branch).toBeNull();
    expect(out.deploymentId).toBeNull();
    expect(out.githubUrl).toBeNull();
  });

  it('treats blank-string env vars as absent', () => {
    const out = readRailwayDeployment({ RAILWAY_GIT_COMMIT_SHA: '   ' });
    expect(out.sha).toBeNull();
    expect(out.shortSha).toBeNull();
  });
});

describe('buildDeploymentInfo', () => {
  const nowMs = Date.parse('2026-06-12T12:00:00.000Z');
  const uptimeSec = 3600; // up 1h → deployed at 11:00

  it('uses Railway env as the live source when a sha is present', () => {
    const info = buildDeploymentInfo(
      {
        RAILWAY_GIT_COMMIT_SHA: 'deadbeef0000000000000000000000000000feed',
        RAILWAY_GIT_COMMIT_MESSAGE: 'feat: shipped live',
        RAILWAY_GIT_BRANCH: 'master',
      },
      SAMPLE_CHANGELOG,
      nowMs,
      uptimeSec,
    );
    expect(info.latest.source).toBe('railway');
    expect(info.latest.subject).toBe('feat: shipped live');
    expect(info.latest.deployedAt).toBe('2026-06-12T11:00:00.000Z');
    expect(info.recent).toHaveLength(2);
    expect(info.builtAt).toBe('2026-06-12T10:00:00.000Z');
  });

  it('falls back to the newest changelog commit when no Railway sha (local/dev)', () => {
    const info = buildDeploymentInfo({}, SAMPLE_CHANGELOG, nowMs, uptimeSec);
    expect(info.latest.source).toBe('changelog');
    expect(info.latest.sha).toBe(SAMPLE_CHANGELOG.commits[0].sha);
    expect(info.latest.subject).toBe(SAMPLE_CHANGELOG.commits[0].subject);
  });

  it('reports source "unknown" when neither env nor changelog has data', () => {
    const info = buildDeploymentInfo({}, { generatedAt: 'x', commits: [] }, nowMs, uptimeSec);
    expect(info.latest.source).toBe('unknown');
    expect(info.latest.sha).toBeNull();
    expect(info.recent).toEqual([]);
  });

  it('omits deployedAt when uptime/now are not provided', () => {
    const info = buildDeploymentInfo(
      { RAILWAY_GIT_COMMIT_SHA: 'abc1234' },
      SAMPLE_CHANGELOG,
    );
    expect(info.latest.deployedAt).toBeNull();
  });

  it('tolerates a null changelog', () => {
    const info = buildDeploymentInfo({ RAILWAY_GIT_COMMIT_SHA: 'abc1234' }, null, nowMs, uptimeSec);
    expect(info.recent).toEqual([]);
    expect(info.builtAt).toBeNull();
    expect(info.latest.source).toBe('railway');
  });
});
