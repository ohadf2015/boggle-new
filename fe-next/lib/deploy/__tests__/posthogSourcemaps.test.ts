import { describe, it, expect, vi } from 'vitest';
import { posthogSourcemapCommand, uploadPosthogSourcemaps } from '../posthogSourcemaps.mjs';

const env = {
  POSTHOG_API_KEY: 'phx_key',
  POSTHOG_PROJECT_ID: '42',
  RAILWAY_GIT_COMMIT_SHA: 'abc123',
};

describe('posthogSourcemapCommand', () => {
  it('returns null without an API key', () => {
    expect(posthogSourcemapCommand({}, '/app/.next')).toBeNull();
  });

  it('processes only the client chunks, tagged with the deployed commit', () => {
    const cmd = posthogSourcemapCommand(env, '/app/.next');
    expect(cmd?.args).toEqual([
      'sourcemap', 'process',
      '--directory', '/app/.next/static/chunks',
      '--release-name', 'lexiclash',
      '--release-version', 'abc123',
    ]);
    expect(cmd?.env).toMatchObject({
      POSTHOG_CLI_API_KEY: 'phx_key',
      POSTHOG_CLI_PROJECT_ID: '42',
      POSTHOG_CLI_HOST: 'https://eu.posthog.com',
    });
  });

  it('leaves deletion to Sentry, which uploads the injected files after it', () => {
    expect(posthogSourcemapCommand(env, '/app/.next')?.args).not.toContain('--delete-after');
  });
});

describe('uploadPosthogSourcemaps', () => {
  it('logs a failed upload with its output and never throws', async () => {
    const error = vi.fn();
    const run = vi.fn().mockReturnValue({ status: 1, stdout: '', stderr: 'bad key' });
    await expect(uploadPosthogSourcemaps('/app/.next', { env, run, log: { error, info: vi.fn() } })).resolves.toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('bad key'));
  });

  it('does nothing without a key', async () => {
    const run = vi.fn();
    await uploadPosthogSourcemaps('/app/.next', { env: {}, run, log: console });
    expect(run).not.toHaveBeenCalled();
  });
});
