import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import ExitHintToast from '../ExitHintToast';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));

describe('ExitHintToast', () => {
  it('shows on lexiclash:exit-hint and hides itself', () => {
    vi.useFakeTimers();
    render(<ExitHintToast />);
    expect(screen.queryByRole('status')).toBeNull();
    act(() => { window.dispatchEvent(new CustomEvent('lexiclash:exit-hint')); });
    expect(screen.getByRole('status').textContent).toBe('common.pressBackAgainToExit');
    act(() => { vi.advanceTimersByTime(2100); });
    expect(screen.queryByRole('status')).toBeNull();
    vi.useRealTimers();
  });
});
