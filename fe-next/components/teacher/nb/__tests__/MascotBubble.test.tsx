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

  it('Given the tail points at the mascot, Then it sits outside the border with room to the mascot, using logical properties only', () => {
    render(<MascotBubble pose="setup" testId="bubble">Just a name.</MascotBubble>);
    const row = screen.getByTestId('bubble');
    const bubble = screen.getByText('Just a name.');
    // Mascot gap leaves clear space beyond the 8px tail (was gap-2: tail touched the mascot).
    expect(row.className).toMatch(/\bgap-5\b/);
    // Tail base sits on the outer border edge (3px border + 16px box), so it is visible, not buried.
    expect(bubble.className).toContain('before:-start-[19px]');
    // RTL-safe: no physical left/right offsets on the tail.
    expect(bubble.className).not.toMatch(/before:-?(left|right)-/);
  });
});
