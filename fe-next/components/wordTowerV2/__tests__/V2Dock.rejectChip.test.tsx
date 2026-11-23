import { createRef, type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { V2Dock } from '../V2Dock';

const noop = () => {};
const base: ComponentProps<typeof V2Dock> = {
  t: (k: string) => k, dockRef: createRef<HTMLDivElement>(), wide: false, dir: 'ltr', swinging: false, composing: true,
  rejected: 'Not in our dictionary', dictError: false, scrambles: 3, wheel: ['a', 'b', 'c'], selected: [], word: '',
  valid: false, reducedMotion: true, canPutBack: false, onScramble: noop, onSelectTile: noop, onDeselectTile: noop,
  onSubmit: noop, onDrop: noop, onPutBack: noop, onBackspace: noop,
};

describe('V2Dock reject chip', () => {
  it('on a phone, floats above the dock panel', () => {
    render(<V2Dock {...base} />);
    expect(screen.getByText('Not in our dictionary').className).toContain('-top-10');
  });

  it('on the wide side panel (whose top is the screen top), sits just above the letters instead of off screen', () => {
    render(<V2Dock {...base} wide />);
    const chip = screen.getByText('Not in our dictionary');
    expect(chip.className).not.toContain('-top-10');
    expect(chip.parentElement?.className).toContain('max-w-md');
  });
});
