/**
 * PracticeInstructions — floating overlay shown by default; dismiss persists
 * to localStorage; reopens via the floating "?" pill.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import PracticeInstructions from '../PracticeInstructions';

beforeEach(() => {
  window.localStorage.clear();
});

describe('PracticeInstructions overlay', () => {
  it('renders the dialog + title for the given mode by default', () => {
    render(<PracticeInstructions mode="classic" />);
    expect(screen.getByTestId('practice-instructions')).toBeInTheDocument();
    expect(screen.getByText('practice.instructions.title')).toBeInTheDocument();
  });

  it('renders three rule lines per mode', () => {
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

  it('dismiss × button hides the overlay and shows the floating "?" pill', () => {
    render(<PracticeInstructions mode="classic" />);
    fireEvent.click(screen.getByTestId('practice-instructions-dismiss'));
    expect(screen.queryByTestId('practice-instructions')).toBeNull();
    expect(screen.getByTestId('practice-instructions-toggle')).toBeInTheDocument();
  });

  it('persists dismissal to localStorage so re-mount keeps it closed', () => {
    const { unmount } = render(<PracticeInstructions mode="classic" />);
    fireEvent.click(screen.getByTestId('practice-instructions-dismiss'));
    unmount();
    render(<PracticeInstructions mode="classic" />);
    expect(screen.queryByTestId('practice-instructions')).toBeNull();
    expect(screen.getByTestId('practice-instructions-toggle')).toBeInTheDocument();
  });

  it('? pill reopens the overlay', () => {
    render(<PracticeInstructions mode="classic" />);
    fireEvent.click(screen.getByTestId('practice-instructions-dismiss'));
    fireEvent.click(screen.getByTestId('practice-instructions-toggle'));
    expect(screen.getByTestId('practice-instructions')).toBeInTheDocument();
  });

  it('dismiss state is per-mode (different modes track separately)', () => {
    const { unmount } = render(<PracticeInstructions mode="classic" />);
    fireEvent.click(screen.getByTestId('practice-instructions-dismiss'));
    unmount();
    render(<PracticeInstructions mode="wordHunt" />);
    // wordHunt was never dismissed — overlay should be visible
    expect(screen.getByTestId('practice-instructions')).toBeInTheDocument();
  });

  it('does not auto-open when autoOpen is false — player lands on the board (learn by doing)', () => {
    render(<PracticeInstructions mode="classic" autoOpen={false} />);
    expect(screen.queryByTestId('practice-instructions')).toBeNull();
    // The on-demand "?" pill is still available for reference.
    expect(screen.getByTestId('practice-instructions-toggle')).toBeInTheDocument();
  });
});
