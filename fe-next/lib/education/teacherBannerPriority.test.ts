import { describe, it, expect } from 'vitest';
import { pickHomeAsk } from './teacherBannerPriority';

describe('pickHomeAsk', () => {
  const none = { account: false, onboarding: false, pro: false };

  it('shows nothing when no ask is live', () => {
    expect(pickHomeAsk(none)).toBe('none');
  });

  it('ranks account blockers, then onboarding, then the Pro card', () => {
    const all = { account: true, onboarding: true, pro: true };
    expect(pickHomeAsk(all)).toBe('account');
    expect(pickHomeAsk({ ...all, account: false })).toBe('onboarding');
    expect(pickHomeAsk({ ...none, pro: true })).toBe('pro');
  });
});
