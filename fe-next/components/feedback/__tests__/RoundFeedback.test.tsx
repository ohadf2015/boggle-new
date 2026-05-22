// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordRating = vi.fn();
const dismiss = vi.fn();
const hookState = { shouldShow: true };

vi.mock('@/hooks/useRoundFeedback', () => ({
  useRoundFeedback: () => ({ shouldShow: hookState.shouldShow, recordRating, dismiss }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import RoundFeedback from '../RoundFeedback';

const props = {
  gameCode: 'ABCD',
  gameMode: 'classic',
  language: 'en',
  isMultiplayer: true,
};

beforeEach(() => {
  recordRating.mockClear();
  dismiss.mockClear();
  hookState.shouldShow = true;
});

describe('RoundFeedback', () => {
  it('renders the prompt and three rating buttons', () => {
    render(<RoundFeedback {...props} />);
    expect(screen.getByText('roundFeedback.prompt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'roundFeedback.bad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'roundFeedback.ok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'roundFeedback.great' })).toBeInTheDocument();
  });

  it('renders nothing when the hook says hidden', () => {
    hookState.shouldShow = false;
    const { container } = render(<RoundFeedback {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('records the chosen rating and shows a thank-you', () => {
    render(<RoundFeedback {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'roundFeedback.great' }));
    expect(recordRating).toHaveBeenCalledWith('great');
    expect(screen.getByText('roundFeedback.thanks')).toBeInTheDocument();
  });

  it('dismisses without recording a rating', () => {
    render(<RoundFeedback {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'roundFeedback.dismiss' }));
    expect(dismiss).toHaveBeenCalled();
    expect(recordRating).not.toHaveBeenCalled();
  });
});
