/**
 * WordCraftStepHint — derives a single visible label from the current step.
 * 'idle' should render no pill (just a spacer), so the layout doesn't jitter
 * while the dictionary is loading or burnout suppresses player action.
 */

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WordCraftStepHint } from '../WordCraftStepHint';

const labels = {
  pick: 'Pick',
  place: 'Place',
  submit: 'Submit',
  bot: 'Bot',
  over: 'Over',
};

describe('WordCraftStepHint', () => {
  it('renders the label that matches the current step', () => {
    const { getByText, rerender } = render(<WordCraftStepHint step="pick" labels={labels} />);
    expect(getByText('Pick')).toBeInTheDocument();
    rerender(<WordCraftStepHint step="place" labels={labels} />);
    expect(getByText('Place')).toBeInTheDocument();
    rerender(<WordCraftStepHint step="submit" labels={labels} />);
    expect(getByText('Submit')).toBeInTheDocument();
    rerender(<WordCraftStepHint step="bot" labels={labels} />);
    expect(getByText('Bot')).toBeInTheDocument();
    rerender(<WordCraftStepHint step="over" labels={labels} />);
    expect(getByText('Over')).toBeInTheDocument();
  });

  it('renders only a spacer when step is idle', () => {
    const { container, queryByText } = render(<WordCraftStepHint step="idle" labels={labels} />);
    expect(queryByText('Pick')).toBeNull();
    expect(queryByText('Place')).toBeNull();
    // idle path returns a single empty div with reserved height
    expect(container.querySelector('[data-step]')).toBeNull();
  });

  it('exposes the active step via data-step for animation hooks', () => {
    const { container } = render(<WordCraftStepHint step="submit" labels={labels} />);
    const pill = container.querySelector('[data-step="submit"]');
    expect(pill).not.toBeNull();
  });
});
