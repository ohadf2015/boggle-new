import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'en',
  }),
}));

import { UpgradeFaq, UPGRADE_FAQ_KEYS, upgradeFaqParams } from '../UpgradeFaq';
import { TEACHER_PRO_TRIAL_DAYS } from '@/lib/education/pro/trialDays';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';

describe('UpgradeFaq', () => {
  it('renders every question as a disclosure with ONE visible chevron and no native marker', () => {
    const { container } = render(<UpgradeFaq />);
    const items = container.querySelectorAll('details');
    expect(items).toHaveLength(UPGRADE_FAQ_KEYS.length);
    for (const d of Array.from(items)) {
      const summary = d.querySelector('summary')!;
      expect(summary.className).toMatch(/list-none/);
      expect(summary.className).toMatch(/\[&::-webkit-details-marker\]:hidden/);
      expect(summary.querySelectorAll('[data-testid="faq-chevron"]')).toHaveLength(1);
      expect(summary.textContent).not.toMatch(/[▶▼►]/);
    }
  });

  it('interpolates the trial length, price and live-game cap from code, not copy', () => {
    const params = upgradeFaqParams();
    expect(params.days).toBe(TEACHER_PRO_TRIAL_DAYS);
    expect(params.players).toBe(MAX_PLAYERS_PER_ROOM);
    render(<UpgradeFaq />);
    expect(screen.getByText(new RegExp(`eg2Pro\\.faq\\.trialA\\|${TEACHER_PRO_TRIAL_DAYS}`))).toBeInTheDocument();
  });

  it('covers the questions a buyer asks: trial, cancel, downgrade, players, school pays', () => {
    expect(UPGRADE_FAQ_KEYS).toEqual(expect.arrayContaining(['trial', 'cancel', 'downgrade', 'players', 'schoolPays']));
  });

  it('answers "Do you offer school pricing?" with the constant-driven price and minimum', () => {
    expect(UPGRADE_FAQ_KEYS).toContain('schoolPrice');
    render(<UpgradeFaq />);
    expect(screen.getByText(/eg2Pro\.faq\.schoolPriceA\|.*\$49\|5/)).toBeInTheDocument();
  });
});
