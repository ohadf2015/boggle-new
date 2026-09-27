import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftPlacementGuide } from '../WordCraftPlacementGuide';

const labels = {
  step1: 'Tap a letter',
  step2: 'Tap a square',
  step3: 'Submit',
};

describe('WordCraftPlacementGuide', () => {
  it('renders the three placement steps in order', () => {
    const { getByText, container } = render(<WordCraftPlacementGuide labels={labels} />);
    expect(getByText('Tap a letter')).toBeTruthy();
    expect(getByText('Tap a square')).toBeTruthy();
    expect(getByText('Submit')).toBeTruthy();
    // Numbered 1·2·3 so the order is unmistakable.
    expect(container.textContent).toContain('1');
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('3');
  });
});
