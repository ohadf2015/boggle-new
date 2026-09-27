/**
 * Tests for dictionary-pipeline telemetry.
 * Emits a PostHog event per scheduled run so "is the dictionary improving over
 * time?" is answerable from a single PostHog trend (verified/promoted/blocked/demoted).
 */

import { vi } from 'vitest';

const { mockCapture, mockFlush, mockGetPostHogServer } = vi.hoisted(() => ({
  mockCapture: vi.fn(),
  mockFlush: vi.fn(),
  mockGetPostHogServer: vi.fn(),
}));

vi.mock('@/lib/posthog', () => ({
  getPostHogServer: mockGetPostHogServer,
}));
vi.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { emitDictionaryRun } from '../dictionaryPipelineTelemetry';

describe('emitDictionaryRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFlush.mockResolvedValue(undefined);
    mockGetPostHogServer.mockReturnValue({ capture: mockCapture, flush: mockFlush });
  });

  it('captures a dict:auto_run event with the stage + counts', async () => {
    await emitDictionaryRun('promote', { promoted: 3, blocked: 1 });

    expect(mockCapture).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: 'system:dictionary-pipeline',
        event: 'dict:auto_run',
        properties: expect.objectContaining({ stage: 'promote', promoted: 3, blocked: 1 }),
      })
    );
    expect(mockFlush).toHaveBeenCalled();
  });

  it('is a no-op (no throw) when PostHog is not configured', async () => {
    mockGetPostHogServer.mockReturnValueOnce(null);
    await expect(emitDictionaryRun('verify', { verified: 5 })).resolves.toBeUndefined();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('never throws even if capture fails', async () => {
    mockCapture.mockImplementationOnce(() => { throw new Error('posthog down'); });
    await expect(emitDictionaryRun('heal', { demoted: 0 })).resolves.toBeUndefined();
  });
});
