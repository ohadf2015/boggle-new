import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { packsForLanguage } from '../starterPackPick';
import { StarterPackRow } from '../StarterPackRow';

const packs = packsForLanguage('en');

describe('StarterPackRow', () => {
  it('Then the pack choice says students get these words as homework, without adding a line on phones', () => {
    render(<StarterPackRow packs={packs} selectedKey={packs[0].nameKey} recommendedKey={packs[0].nameKey} onSelect={vi.fn()} t={(k) => k} />);
    const group = screen.getByRole('radiogroup');
    const hint = screen.getByText('eduShell.setup.packHint');
    expect(group).toHaveAttribute('aria-describedby', hint.id);
    expect(hint.className).toContain('max-sm:sr-only');
  });
});
