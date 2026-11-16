import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { en } from '@/translations/en';
import { PlayHero } from '../PlayHero';

vi.mock('@/utils/growthTracking', () => ({ trackLandingCtaClick: vi.fn() }));

const t = (key: string, params: Record<string, string | number> = {}) => {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : key;
};

function stubPointer(coarse: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: coarse && query.includes('pointer: coarse'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderHero() {
  return render(
    <PlayHero
      lang="he"
      t={t}
      animate
      avatar={{ userId: 'guest', customAvatar: null }}
      greeting="היי"
      streak={3}
      streakLoading={false}
      onAvatarSaved={vi.fn()}
    />,
  );
}

describe('PlayHero idle motion on a phone', () => {
  it('does not keep the celebration rays and ornament loops running on a touch phone', () => {
    stubPointer(true);
    renderHero();
    // Two 640px masked conic layers at phone DPR are ~1680px GPU textures.
    // Leaving them spinning on the idle home screen is what heats the phone.
    expect(screen.getByTestId('quick-results-rays')).toHaveAttribute('data-spinning', 'false');
    expect(screen.queryByTestId('quick-results-sparkles')).toBeNull();
    expect(screen.getByTestId('hp-hero').innerHTML).not.toMatch(/infinite/);
  });

  it('still spins the rays when the pointer is a mouse', () => {
    stubPointer(false);
    renderHero();
    expect(screen.getByTestId('quick-results-rays')).toHaveAttribute('data-spinning', 'true');
    expect(screen.getByTestId('quick-results-sparkles')).toBeTruthy();
    expect(screen.getByTestId('hp-hero').innerHTML).toMatch(/infinite/);
  });
});
