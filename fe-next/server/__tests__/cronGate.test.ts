/**
 * A QA preview deployed as its own Railway service inside the production
 * environment (qa-gauntlet-pr1067, 09-15 → 09-26) inherited prod env vars and ran
 * every prod cron on stale code, racing the real service for the Redis lock.
 */
import { describe, it, expect } from 'vitest';
import { cronsDisabledReason } from '../cronGate';

describe('cronsDisabledReason', () => {
  it('runs crons on the canonical Railway service', () => {
    expect(cronsDisabledReason({ RAILWAY_SERVICE_NAME: 'boggle-new' })).toBeNull();
  });

  it('refuses crons on any other Railway service', () => {
    expect(cronsDisabledReason({ RAILWAY_SERVICE_NAME: 'qa-gauntlet-pr1067' })).toMatch(/qa-gauntlet-pr1067/);
  });

  it('honours CRON_SERVICE_NAME when the canonical service is renamed', () => {
    expect(cronsDisabledReason({ RAILWAY_SERVICE_NAME: 'web', CRON_SERVICE_NAME: 'web' })).toBeNull();
  });

  it('lets DISABLE_CRONS=1 win everywhere', () => {
    expect(cronsDisabledReason({ RAILWAY_SERVICE_NAME: 'boggle-new', DISABLE_CRONS: '1' })).toMatch(/DISABLE_CRONS/);
  });

  it('leaves non-Railway servers as before', () => {
    expect(cronsDisabledReason({})).toBeNull();
  });
});
