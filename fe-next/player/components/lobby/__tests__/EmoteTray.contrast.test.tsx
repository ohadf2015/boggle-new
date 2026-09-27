/**
 * The emote trigger must read as a control on the lobby card (WCAG non-text
 * contrast + the twMerge border-width pitfall).
 *
 * History: as a navy-light square its edge measured 1.07:1 — `cn()` filed both
 * border classes in the colour group and tailwind-merge dropped the width, so
 * preflight's `border-width: 0` won. Written as an arbitrary width
 * (`border-[2px]`) it survives the merge. The button is a pink face now, so
 * the edge is black-on-pink (cream-on-pink would sink under 3:1) — but the
 * width-pitfall guard stays.
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

  it('borders in black on the pink face — cream on pink would sink under 3:1', () => {
    render(<EmoteTray onEmote={vi.fn()} t={t} compact />);
    const cls = screen.getByTestId('emote-trigger').className;
    expect(cls).toContain('bg-neo-pink');
    expect(cls).toContain('border-neo-black');
    expect(cls).not.toContain('border-neo-cream');
    expect(cls).toContain('rounded-full');
  });
});
