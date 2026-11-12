import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const hook = vi.hoisted(() => ({
  value: { status: 'ready', title: null as string | null, save: vi.fn(async () => true), retry: vi.fn() },
}));
vi.mock('../useChosenTitle', () => ({ useChosenTitle: () => hook.value }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${JSON.stringify(p)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

import { TitlePicker } from '../TitlePicker';

describe('TitlePicker', () => {
  beforeEach(() => {
    hook.value = { status: 'ready', title: null, save: vi.fn(async () => true), retry: vi.fn() };
  });

  it('lists only unlocked titles and teases the next locked one', () => {
    // Given a level-12 player
    render(<TitlePicker userId="u1" level={12} />);
    // Then the two unlocked level titles are pickable
    expect(screen.getByRole('radio', { name: 'landing.home.titles.WORD_SEEKER' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'landing.home.titles.LETTER_SCOUT' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'landing.home.titles.VOCAB_WARRIOR' })).toBeNull();
    // And the next title is teased with its level
    expect(screen.getByTestId('title-next-locked')).toHaveTextContent('"level":15');
  });

  it('picking a title saves it', () => {
    render(<TitlePicker userId="u1" level={12} />);
    fireEvent.click(screen.getByRole('radio', { name: 'landing.home.titles.WORD_SEEKER' }));
    expect(hook.value.save).toHaveBeenCalledWith('WORD_SEEKER');
  });

  it('a failed load shows a retry, not an empty picker', () => {
    hook.value = { ...hook.value, status: 'error' };
    render(<TitlePicker userId="u1" level={12} />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(hook.value.retry).toHaveBeenCalled();
  });
});
