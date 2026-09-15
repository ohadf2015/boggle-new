import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  SIGNUP_PROMPT_SHOWN_KEY,
  SIGNUP_PROMPT_ACTIVE_EVENT,
  emitSignupPromptActive,
  shouldSuppressOneTapForSignupFunnel,
} from '../signupPromptCoordination';

describe('signupPromptCoordination (t_da22db9a)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('suppresses One Tap once the session signup latch is set', () => {
    expect(shouldSuppressOneTapForSignupFunnel(() => 0)).toBe(false);
    sessionStorage.setItem(SIGNUP_PROMPT_SHOWN_KEY, 'true');
    expect(shouldSuppressOneTapForSignupFunnel(() => 0)).toBe(true);
  });

  it('suppresses One Tap when guest already completed ≥1 game (post-game funnel owns auth)', () => {
    expect(shouldSuppressOneTapForSignupFunnel(() => 0)).toBe(false);
    expect(shouldSuppressOneTapForSignupFunnel(() => 1)).toBe(true);
    expect(shouldSuppressOneTapForSignupFunnel(() => 5)).toBe(true);
  });

  it('emitSignupPromptActive dispatches the coordination event', () => {
    const handler = vi.fn();
    window.addEventListener(SIGNUP_PROMPT_ACTIVE_EVENT, handler);
    emitSignupPromptActive(true);
    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ active: true });
    window.removeEventListener(SIGNUP_PROMPT_ACTIVE_EVENT, handler);
  });
});
