// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { EducationLandingProjector, DEMO_JOIN_CODE } from '../EducationLandingProjector';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

afterEach(() => vi.useRealTimers());

describe('EducationLandingProjector', () => {
  it('shows a join code the real generator can never produce', () => {
    expect(DEMO_JOIN_CODE).toHaveLength(6);
    expect(DEMO_JOIN_CODE).toMatch(/[01IO]/);
  });

  it('renders the join code and the class roster in one frame', () => {
    const { container } = render(<EducationLandingProjector youScore={0} />);
    expect(container.textContent).toContain(DEMO_JOIN_CODE);
    expect(container.textContent).toContain('eg6Land.projector.you');
  });

  it('keeps the animated frame out of the accessibility tree', () => {
    const { container } = render(<EducationLandingProjector youScore={0} />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('eg6Land.projector.srOnly')).toBeInTheDocument();
  });

  it('keeps the education mascot decorative inside the frame', () => {
    const { container } = render(<EducationLandingProjector youScore={0} />);
    const mascot = Array.from(container.querySelectorAll('img')).find((img) =>
      (img.getAttribute('src') ?? '').includes('/mascot/edu/'),
    );
    expect(mascot?.closest('[aria-hidden="true"]')).toBeTruthy();
  });

  it('moves the visitor row up the leaderboard as they find words', () => {
    vi.useFakeTimers();
    const { rerender, container } = render(<EducationLandingProjector youScore={0} />);
    act(() => vi.runAllTimers());
    rerender(<EducationLandingProjector youScore={6} />);
    act(() => vi.runAllTimers());
    const rows = Array.from(container.querySelectorAll('[data-player]')).map((el) => el.getAttribute('data-player'));
    expect(rows[0]).toBe('you');
  });
});
