import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));

import { MascotBubble } from '../MascotBubble';

describe('MascotBubble', () => {
  it('Given a pose and a line, Then the line is readable text and the mascot is decorative', () => {
    render(<MascotBubble pose="setup" testId="bubble">Just a name.</MascotBubble>);
    expect(screen.getByText('Just a name.')).toBeInTheDocument();
    const img = screen.getByTestId('edu-mascot-setup');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveAttribute('alt', '');
  });

  it('Given the page behind the bubble is dark, Then the tail is cream with its own black outline, so it stays visible in RTL and LTR', () => {
    render(<MascotBubble pose="setup" testId="bubble">Just a name.</MascotBubble>);
    const row = screen.getByTestId('bubble');
    const bubble = screen.getByText('Just a name.');
    // Room between the tail tip and the mascot.
    expect(row.className).toMatch(/\bgap-5\b/);
    // A black-only triangle vanished against the dark page; the tail is a cream diamond outlined in black.
    expect(bubble.className).toContain('before:bg-neo-cream');
    expect(bubble.className).toContain('before:border-neo-black');
    expect(bubble.className).not.toContain('before:border-transparent');
    // Points at the mascot on either side: logical offset + border, mirrored rotation in RTL.
    expect(bubble.className).toContain('before:-start-[10px]');
    expect(bubble.className).toContain('before:border-s-[3px]');
    expect(bubble.className).toContain('before:rotate-45');
    expect(bubble.className).toContain('rtl:before:-rotate-45');
    expect(bubble.className).not.toMatch(/before:-?(left|right)-/);
  });
});
