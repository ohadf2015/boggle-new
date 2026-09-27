import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();

vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: {
    capture: (...args: unknown[]) => captureMock(...args),
  },
}));

import {
  trackWordCraftAxisLocked,
  trackWordCraftFastTapUsed,
  trackWordCraftOffAxisDrop,
  trackWordCraftPendingRecall,
  trackWordCraftRecallAll,
  trackWordCraftTurnSubmitted,
} from '../wordCraftTelemetry';

beforeEach(() => {
  captureMock.mockReset();
});

describe('wordCraftTelemetry', () => {
  it('emits word_craft_axis_locked with payload', () => {
    trackWordCraftAxisLocked({ axis: 'h', turnNumber: 1, turnId: 't-1' });
    expect(captureMock).toHaveBeenCalledWith('word_craft_axis_locked', {
      axis: 'h',
      turnNumber: 1,
      turnId: 't-1',
    });
  });

  it('emits word_craft_fast_tap_used', () => {
    trackWordCraftFastTapUsed({ turnId: 't-1', tilesPlaced: 3 });
    expect(captureMock).toHaveBeenCalledWith('word_craft_fast_tap_used', {
      turnId: 't-1',
      tilesPlaced: 3,
    });
  });

  it('emits word_craft_drag_dropped_off_axis', () => {
    trackWordCraftOffAxisDrop({ turnId: 't-1' });
    expect(captureMock).toHaveBeenCalledWith('word_craft_drag_dropped_off_axis', {
      turnId: 't-1',
    });
  });

  it('emits word_craft_pending_recall with source label', () => {
    trackWordCraftPendingRecall({ turnId: 't-1', source: 'strip' });
    expect(captureMock).toHaveBeenCalledWith('word_craft_pending_recall', {
      turnId: 't-1',
      source: 'strip',
    });
  });

  it('emits word_craft_recall_all with tile count', () => {
    trackWordCraftRecallAll({ turnId: 't-1', tilesRecalled: 4 });
    expect(captureMock).toHaveBeenCalledWith('word_craft_recall_all', {
      turnId: 't-1',
      tilesRecalled: 4,
    });
  });

  it('emits word_craft_turn_submitted with input method', () => {
    trackWordCraftTurnSubmitted({
      turnId: 't-1',
      inputMethod: 'fast-tap',
      tilesPlaced: 5,
      score: 24,
    });
    expect(captureMock).toHaveBeenCalledWith('word_craft_turn_submitted', {
      turnId: 't-1',
      inputMethod: 'fast-tap',
      tilesPlaced: 5,
      score: 24,
    });
  });

  it('never throws when posthog.capture throws', () => {
    captureMock.mockImplementation(() => {
      throw new Error('posthog not initialized');
    });
    expect(() => trackWordCraftAxisLocked({ axis: 'v', turnNumber: 2, turnId: 't-2' })).not.toThrow();
    expect(() => trackWordCraftFastTapUsed({ turnId: 't-2', tilesPlaced: 1 })).not.toThrow();
    expect(() => trackWordCraftTurnSubmitted({ turnId: 't-2', inputMethod: 'tap', tilesPlaced: 1, score: 5 })).not.toThrow();
  });
});
