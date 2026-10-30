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
});
