import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import PracticeTutorialArt from '../PracticeTutorialArt';

describe('PracticeTutorialArt', () => {
  it('renders a unique illustration per (mode, slide) pair', () => {
    const slides = [0, 1, 2];
    const modes = ['classic', 'wordHunt', 'wheelRush'] as const;
    const fingerprints = new Set<string>();
    for (const mode of modes) {
      for (const idx of slides) {
        const { container } = render(<PracticeTutorialArt mode={mode} idx={idx} />);
        // outerHTML must be unique across all 9 combinations
        fingerprints.add(container.firstChild?.toString() + ':' + container.innerHTML);
      }
    }
    expect(fingerprints.size).toBe(9);
  });

  it('exposes a stable test id encoding mode + slide', () => {
    const { getByTestId } = render(<PracticeTutorialArt mode="classic" idx={1} />);
    expect(getByTestId('practice-tutorial-art-classic-1')).toBeInTheDocument();
  });

  it('marks itself aria-hidden — text caption announces the tip', () => {
    const { getByTestId } = render(<PracticeTutorialArt mode="wheelRush" idx={2} />);
    expect(getByTestId('practice-tutorial-art-wheelRush-2').getAttribute('aria-hidden')).toBe('true');
  });
});
