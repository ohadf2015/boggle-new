import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HuntFeedbackPill } from '../HuntFeedbackPill';

describe('HuntFeedbackPill', () => {
  it('Given a message is showing, When the next word lands, Then the new result replaces it in the same frame', () => {
    const { rerender } = render(<HuntFeedbackPill seq={1} type="valid-word" message="+3 life" word="CAT" calm={false} />);
    expect(screen.getByTestId('hunt-feedback-pill')).toHaveTextContent('CAT');

    rerender(<HuntFeedbackPill seq={2} type="not-in-dictionary" message="Not a word -4" word="CAX" calm={false} />);
    const pills = screen.getAllByTestId('hunt-feedback-pill');
    expect(pills).toHaveLength(1);
    expect(pills[0]).toHaveTextContent('CAX');
    expect(pills[0]).toHaveAttribute('data-type', 'not-in-dictionary');
  });

  it('Given no feedback, When rendered, Then the row stays empty', () => {
    render(<HuntFeedbackPill seq={0} type={null} message="" word={null} calm={false} />);
    expect(screen.queryByTestId('hunt-feedback-pill')).toBeNull();
  });

  it('Given each outcome, When shown, Then valid, invalid, already-found and could-not-check each get their own colour', () => {
    const toneOf = (type: 'valid-word' | 'not-in-dictionary' | 'duplicate' | 'unavailable') => {
      const { unmount } = render(<HuntFeedbackPill seq={1} type={type} message="m" word="W" calm />);
      const cls = screen.getByTestId('hunt-feedback-pill').className;
      unmount();
      return cls;
    };
    const tones = new Set([toneOf('valid-word'), toneOf('not-in-dictionary'), toneOf('duplicate'), toneOf('unavailable')]);
    expect(tones.size).toBe(4);
  });

  it('Given the hidden word is found, Then no small pill shows: the clue row and board carry the solve', () => {
    render(<HuntFeedbackPill seq={3} type="target-found" message="You Found It!" word="PLATE" calm={false} />);
    expect(screen.getByTestId('hunt-feedback-row')).toBeInTheDocument();
    expect(screen.queryByTestId('hunt-feedback-pill')).toBeNull();
  });

  it('Given a rejected word, Then the pill is not a live region (the shared announcer reads it once); a scored word still is', () => {
    const { rerender } = render(<HuntFeedbackPill seq={1} type="not-on-board" message="Not on the board" word="QZX" calm />);
    expect(screen.getByTestId('hunt-feedback-pill')).not.toHaveAttribute('role');
    rerender(<HuntFeedbackPill seq={2} type="valid-word" message="+3 life" word="CAT" calm />);
    expect(screen.getByTestId('hunt-feedback-pill')).toHaveAttribute('role', 'status');
  });

  it('Given a rejection nothing else announces (invalid-word), Then the pill still speaks it', () => {
    render(<HuntFeedbackPill seq={1} type="invalid-word" message="Not a word" word="QZX" calm />);
    expect(screen.getByTestId('hunt-feedback-pill')).toHaveAttribute('role', 'status');
  });
});
