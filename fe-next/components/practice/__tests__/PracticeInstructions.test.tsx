/**
 * PracticeInstructions — collapsible "How to play" card on each sandbox.
 * Open by default so new players see the rules without an extra tap.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import PracticeInstructions from '../PracticeInstructions';

describe('PracticeInstructions', () => {
  it('renders the panel + title for the given mode', () => {
    render(<PracticeInstructions mode="classic" />);
    expect(screen.getByTestId('practice-instructions')).toBeInTheDocument();
    expect(screen.getByText('practice.instructions.title')).toBeInTheDocument();
  });

  it('renders three rule lines per mode by default', () => {
    render(<PracticeInstructions mode="wordHunt" />);
    const list = screen.getByTestId('practice-instructions-list');
    expect(list.querySelectorAll('li')).toHaveLength(3);
  });

  it('uses mode-specific tip keys', () => {
    render(<PracticeInstructions mode="wheelRush" />);
    expect(screen.getByText('practice.instructions.wheelRush.line1')).toBeInTheDocument();
    expect(screen.getByText('practice.instructions.wheelRush.line2')).toBeInTheDocument();
    expect(screen.getByText('practice.instructions.wheelRush.line3')).toBeInTheDocument();
  });

  it('toggles closed when the toggle button is clicked', () => {
    render(<PracticeInstructions mode="classic" />);
    expect(screen.getByTestId('practice-instructions-list')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('practice-instructions-toggle'));
    expect(screen.queryByTestId('practice-instructions-list')).toBeNull();
  });

  it('reopens after a second toggle click', () => {
    render(<PracticeInstructions mode="classic" />);
    const toggle = screen.getByTestId('practice-instructions-toggle');
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByTestId('practice-instructions-list')).toBeInTheDocument();
  });
});
