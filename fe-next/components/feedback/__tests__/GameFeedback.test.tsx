// @vitest-environment happy-dom
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const recordRating = vi.fn();
const dismiss = vi.fn();
const hookState = { shouldShow: true };

vi.mock('@/hooks/useGameFeedback', () => ({
  useGameFeedback: () => ({ shouldShow: hookState.shouldShow, recordRating, dismiss }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import GameFeedback from '../GameFeedback';

const props = { surface: 'singleplayer' as const, gameMode: 'classic', language: 'en', eligible: true };

beforeEach(() => {
  recordRating.mockClear();
  dismiss.mockClear();
  hookState.shouldShow = true;
});

describe('GameFeedback', () => {
  it('renders the prompt and three rating buttons', () => {
    render(<GameFeedback {...props} />);
    expect(screen.getByText('gameFeedback.prompt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gameFeedback.bad' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gameFeedback.ok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gameFeedback.great' })).toBeInTheDocument();
  });

  it('renders nothing when the hook says hidden', () => {
    hookState.shouldShow = false;
    const { container } = render(<GameFeedback {...props} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('records the chosen rating and shows a thank-you', () => {
    render(<GameFeedback {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'gameFeedback.great' }));
    expect(recordRating).toHaveBeenCalledWith('great');
    expect(screen.getByText('gameFeedback.thanks')).toBeInTheDocument();
  });

  it('dismisses without recording a rating', () => {
    render(<GameFeedback {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'gameFeedback.dismiss' }));
    expect(dismiss).toHaveBeenCalled();
    expect(recordRating).not.toHaveBeenCalled();
  });
});
