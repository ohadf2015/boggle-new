/**
 * Guards the bug class that shipped in this component: the strings existed in every locale file,
 * but at a nested path (`dailyStreak.*`) while the component called them flat — so the toast rendered
 * the literal key. A grep for the key's existence passes while the screen is broken, and an
 * identity-mock `t` passes too. Only a REAL LanguageProvider render catches it.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { StreakFreezeToast } from '../StreakFreezeToast';

const FREEZE = { date: '2026-09-18', freezesRemaining: 2 };

function renderToast() {
  return render(
    <LanguageProvider>
      <StreakFreezeToast freezeApplied={FREEZE} />
    </LanguageProvider>,
  );
}

describe('StreakFreezeToast copy resolves through the real translator', () => {
  it('renders translated copy, never the raw translation key', () => {
    renderToast();
    const status = screen.getByRole('status');
    expect(status.textContent ?? '').not.toContain('streak_freeze_toast_message');
    expect(status.textContent ?? '').not.toContain('dailyStreak.');
  });

  it('interpolates the remaining-freeze count into the message', () => {
    renderToast();
    expect(screen.getByRole('status').textContent ?? '').toContain('2');
  });

  it('leaves no unresolved interpolation placeholders in the message', () => {
    renderToast();
    const text = screen.getByRole('status').textContent ?? '';
    expect(text).not.toMatch(/\{(day|remaining|plural)\}/);
  });
});
