/**
 * BullMQ cron registration tests.
 *
 * Guards a real regression: the BullMQ path (USE_BULLMQ=true) must register
 * EVERY job the node-cron path runs. Re-engagement email was missing here —
 * flipping USE_BULLMQ would have silently killed it.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

const { upsertJobScheduler } = vi.hoisted(() => ({
  upsertJobScheduler: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bullmq', () => ({
  // Class mocks — `new Queue(...)` needs a real constructor (arrow fns can't construct).
  Queue: class {
    upsertJobScheduler = upsertJobScheduler;
    add = vi.fn();
    close = vi.fn();
  },
  Worker: class {
    on = vi.fn();
    close = vi.fn();
  },
}));

// Top-level dynamic imports inside registerAllCronJobs — stub to keep the test
// light (handler bodies are never invoked here, only registered).
vi.mock('../../services/wikipediaWordPopulator', () => ({ populateWikipediaWords: vi.fn() }));
vi.mock('../../modules/dictionaryEnrichment', () => ({ runDictionaryEnrichment: vi.fn() }));

import { initCronQueue, registerAllCronJobs } from '../cronQueue';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerAllCronJobs (BullMQ)', () => {
  it('registers the re-engagement email job (parity with node-cron)', async () => {
    initCronQueue();
    await registerAllCronJobs();

    const registeredJobNames = upsertJobScheduler.mock.calls.map((c) => c[0]);
    expect(registeredJobNames).toContain('reengagement-email');
    // sanity: the hourly push job is also still registered
    expect(registeredJobNames).toContain('daily-challenge-reminder');
  });
});
