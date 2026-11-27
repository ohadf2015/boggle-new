import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

import { JoinCodeField } from '../JoinCodeField';
import { JoinTargetCard } from '../JoinTargetCard';

const cells = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-testid="join-code-cell"]')) as HTMLElement[];

describe('join screens on the sky skin', () => {
  it('Given a half-typed code, Then the letters are cream tiles inside one white card', () => {
    const { container } = render(<JoinCodeField value="K7" onChange={() => {}} label="code" />);
    expect(cells(container)[0].className).toMatch(/(^|\s)bg-edu-tile(\s|$)/);
    expect(cells(container)[0].className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);
    expect(screen.getByTestId('join-code-card').className).toContain('edu-card');
  });

  it('Given the paste button, Then it is a cyan square with black ink inside the card', () => {
    render(<JoinCodeField value="" onChange={() => {}} onPaste={() => {}} label="code" />);
    const paste = screen.getByRole('button', { name: 'joinView.pasteCode' });
    expect(paste.className).toMatch(/(^|\s)bg-neo-cyan(\s|$)/);
    expect(paste.className).toContain('text-neo-black');
  });

  it('Given a live game, Then the card is white with a pink header band and black ink', () => {
    render(<JoinTargetCard target={{ verdict: 'game', label: '7B English', gameCode: 'K7Q2WM' }} />);
    const card = screen.getByTestId('join-target-card');
    expect(card.className).toContain('edu-card');
    expect(card.className).not.toMatch(/(^|\s)bg-neo-pink(\s|$)/);
    expect(screen.getByTestId('join-target-band').className).toMatch(/(^|\s)bg-neo-pink(\s|$)/);
  });
});
