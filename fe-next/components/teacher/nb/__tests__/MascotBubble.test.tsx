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
});
