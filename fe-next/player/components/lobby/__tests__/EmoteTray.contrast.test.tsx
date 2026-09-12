/**
 * The emote trigger measured 1.07:1 against the lobby card it sits on.
 *
 * Its class list reads `border-neo border-neo-black` through `cn()`, and
 * tailwind-merge files BOTH of those in the border-colour group — so the width
 * is dropped, Tailwind preflight leaves `border-width: 0`, and a navy-light
 * button on a slate card has no edge at all. Written as an arbitrary width next
 * to a cream colour it survives the merge and clears the 3:1 edge rule.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmoteTray } from '../EmoteTray';

const t = (k: string) => k;

describe('EmoteTray — the trigger reads as a control on a navy card', () => {
  it('carries an explicit border width that twMerge cannot drop', () => {
    render(<EmoteTray onEmote={vi.fn()} t={t} compact />);
    expect(screen.getByTestId('emote-trigger').className).toContain('border-[2px]');
  });

  it('borders in cream, not black — black on navy is 1.23:1', () => {
    render(<EmoteTray onEmote={vi.fn()} t={t} compact />);
    const cls = screen.getByTestId('emote-trigger').className;
    expect(cls).toContain('border-neo-cream');
    expect(cls).not.toContain('border-neo-black');
  });
});
