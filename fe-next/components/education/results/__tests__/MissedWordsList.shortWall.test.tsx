import { render, screen } from '@testing-library/react';
import { MissedWordsList } from '../MissedWordsList';

const t = (k: string) => k;
const words = Array.from({ length: 12 }, (_, i) => ({ word: `word${i}`, foundBy: 1, of: 12 })) as never;

describe('MissedWordsList on a short projector wall', () => {
  it('Given the filled side column, When the wall is 900px tall or less, Then the chips drop a size so Play again and End game stay on screen', () => {
    render(<MissedWordsList words={words} maxChips={14} fill title="Missed" t={t} />);
    const chip = screen.getAllByTestId('edu-most-missed-word')[0];
    expect(chip.className).toContain('@5xl/results:text-2xl');
    expect(chip.className).toContain('@5xl/results:[@media(max-height:900px)]:text-lg');
    expect(chip.className).toContain('@5xl/results:[@media(max-height:900px)]:py-0.5');
  });
});
