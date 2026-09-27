import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock confetti utils
vi.mock('@/utils/confettiUtils', () => ({
  fireVictoryConfetti: vi.fn(),
  fireFireworks: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => {
  const mockToastCustom = vi.fn((render, options) => {
    return options?.id || `quest-toast-${Date.now()}`;
  });
  const mockToastDismiss = vi.fn();

  return {
    default: {
      custom: mockToastCustom,
      dismiss: mockToastDismiss,
    },
    mockToastCustom,
    mockToastDismiss,
  };
});

import { showQuestCompletionToast } from '../QuestCompletionToast';
import toastModule from 'react-hot-toast';

describe('QuestCompletionToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track quest toast IDs and dismiss only the previous quest toast, not all toasts', () => {
    const mockToastCustom = (toastModule.custom as any).getMockImplementation() ? toastModule.custom : toastModule.custom;
    const mockToastDismiss = toastModule.dismiss;

    // First call - should not dismiss anything yet
    showQuestCompletionToast({
      questName: 'Quest 1',
      xpReward: 100,
    });

    expect(mockToastCustom).toHaveBeenCalledTimes(1);
    expect(mockToastDismiss).not.toHaveBeenCalled();

    // Second call - should dismiss the first quest toast ID
    showQuestCompletionToast({
      questName: 'Quest 2',
      xpReward: 200,
      dedupKey: 'quest-2',
    });

    expect(mockToastCustom).toHaveBeenCalledTimes(2);
    // Should dismiss with an ID, not bare toast.dismiss()
    expect(mockToastDismiss).toHaveBeenCalled();
    const dismissArgs = (mockToastDismiss as any).mock.calls[0];
    expect(dismissArgs.length).toBeGreaterThan(0);
    expect(dismissArgs[0]).toBeDefined();
  });

  it('should pass explicit toast ID to toast.custom options', () => {
    const mockToastCustom = toastModule.custom;

    showQuestCompletionToast({
      questName: 'Test Quest',
      xpReward: 100,
      dedupKey: 'my-test-quest',
    });

    const customCall = (mockToastCustom as any).mock.calls[0];
    const options = customCall[1];

    // Toast should have an id property in options
    expect(options).toHaveProperty('id');
    expect(typeof options.id).toBe('string');
  });
});
