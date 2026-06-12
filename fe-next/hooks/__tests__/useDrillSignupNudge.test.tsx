// @vitest-environment happy-dom
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/auth/FirstWinSignupModal', () => ({
  default: (props: { isOpen: boolean }) => <div data-open={props.isOpen} />,
}));

import { useDrillSignupNudge } from '../useDrillSignupNudge';

describe('useDrillSignupNudge', () => {
  it('renders the signup modal closed by default', () => {
    const { result } = renderHook(() => useDrillSignupNudge());
    expect((result.current.signupNudge as React.ReactElement).props.isOpen).toBe(false);
  });

  it('opens the modal when promptSignup is called (guest finished a drill)', () => {
    const { result } = renderHook(() => useDrillSignupNudge());
    act(() => result.current.promptSignup());
    expect((result.current.signupNudge as React.ReactElement).props.isOpen).toBe(true);
  });
});
