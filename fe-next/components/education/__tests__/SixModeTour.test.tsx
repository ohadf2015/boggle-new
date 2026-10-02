import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SixModeTour } from '../SixModeTour';
import { TEACHER_GAME_MODES } from '@/lib/education/gameModes';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, _f?: unknown, v?: Record<string, string>) => (v?.minutes ? `${k}:${v.minutes}` : k),
    language: 'en',
  }),
}));

describe('SixModeTour', () => {
  it('shows exactly the modes a teacher can launch in a live class', () => {
    render(<SixModeTour />);
    for (const mode of TEACHER_GAME_MODES) {
      expect(screen.getByText(mode.nameKey)).toBeInTheDocument();
      expect(screen.getByText(mode.howKey)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('landing-mode-card')).toHaveLength(TEACHER_GAME_MODES.length);
  });

  it('shows each mode at its real round length', () => {
    render(<SixModeTour />);
    const first = TEACHER_GAME_MODES[0];
    expect(screen.getAllByText(`eg2Land.modes.minutes:${first.minutes}`).length).toBeGreaterThan(0);
  });

  it('sends nobody to consumer games from the teacher page', () => {
    const { container } = render(<SixModeTour />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    for (const h of hrefs) expect(h).not.toMatch(/\/(daily|adventure|practice|multiplayer|blast)(\/|$)/);
  });
});
