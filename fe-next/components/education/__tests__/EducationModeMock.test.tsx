import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EducationModeMock } from '../EducationModeMock';

// t() echoes the key so we can assert on stable i18n keys.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

describe('EducationModeMock', () => {
  it('renders an accessible figure described by the caption', () => {
    render(<EducationModeMock />);
    const fig = screen.getByRole('img', { name: 'education.landing.mock.caption' });
    expect(fig).toBeInTheDocument();
  });

  it('shows the classroom join code', () => {
    render(<EducationModeMock />);
    expect(screen.getByTestId('mock-join-code')).toHaveTextContent('4821');
    expect(screen.getByText('education.landing.mock.join_label')).toBeInTheDocument();
  });

  it('shows a LIVE indicator and the players-online label', () => {
    render(<EducationModeMock />);
    expect(screen.getByText('education.landing.mock.live')).toBeInTheDocument();
    expect(screen.getByText('education.landing.mock.players')).toBeInTheDocument();
  });

  it('renders a 16-tile letter board', () => {
    render(<EducationModeMock />);
    const board = screen.getByTestId('mock-board');
    // Each tile is a direct child span
    expect(board.querySelectorAll('[data-mock-tile]')).toHaveLength(16);
  });

  it('renders the live leaderboard with three students', () => {
    render(<EducationModeMock />);
    expect(screen.getByText('education.landing.mock.leaderboard_title')).toBeInTheDocument();
    expect(screen.getByText('education.landing.mock.s1')).toBeInTheDocument();
    expect(screen.getByText('education.landing.mock.s2')).toBeInTheDocument();
    expect(screen.getByText('education.landing.mock.s3')).toBeInTheDocument();
  });
});
