import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AutoClueStack } from '../AutoClueNotification';

const t = (k: string) => k;

describe('AutoClueStack', () => {
  const notes = [{ id: 'a', clueType: 'reveal_letter' as const }];

  it('Given a clue unlocks, Then the toast sits at the bottom, clear of the clue boxes it is announcing', () => {
    render(<AutoClueStack notifications={notes} onDismiss={vi.fn()} direction="ltr" t={t} language="en" />);
    const stack = screen.getByTestId('auto-clue-stack');
    expect(stack.className).toMatch(/\bbottom-/);
    expect(stack.className).not.toMatch(/\btop-/);
  });

  it('Given a clue unlocks, Then the toast uses a solid brand color, not a gradient', () => {
    render(<AutoClueStack notifications={notes} onDismiss={vi.fn()} direction="ltr" t={t} language="en" />);
    expect(screen.getByTestId('auto-clue-toast').className).not.toMatch(/gradient|bg-linear/);
  });
});
