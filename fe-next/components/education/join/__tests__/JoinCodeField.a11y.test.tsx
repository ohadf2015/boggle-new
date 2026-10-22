import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr', language: 'en' }),
}));

import { JoinCodeField } from '../JoinCodeField';

const cells = (c: HTMLElement) => Array.from(c.querySelectorAll('[data-testid="join-code-cell"]')) as HTMLElement[];

describe('<JoinCodeField>', () => {
  it('only lights the next cell while the field is focused, so the highlight is the focus indicator', () => {
    const { container } = render(<JoinCodeField value="P4" onChange={() => {}} label="code" />);
    const active = cells(container)[2];
    expect(active.className).toContain('group-focus-within:bg-neo-cyan');
    expect(active.className).not.toMatch(/(^|\s)bg-neo-cyan(\s|$)/);
  });

  it('keeps the letter pop and caret pulse behind motion-safe', () => {
    const { container } = render(<JoinCodeField value="P" onChange={() => {}} label="code" />);
    expect(container.querySelector('.animate-neo-pop')).toBeNull();
    expect(container.querySelector('.animate-pulse')).toBeNull();
    expect(container.querySelector('[class*="motion-safe:animate-neo-pop"]')).not.toBeNull();
  });

  it('uppercases and strips a pasted code with spaces and dashes', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();
    render(<JoinCodeField value="" onChange={onChange} onComplete={onComplete} label="code" />);
    fireEvent.paste(screen.getByTestId('join-code-input'), { clipboardData: { getData: () => 'p45-krt' } });
    expect(onChange).toHaveBeenCalledWith('P45KRT');
    expect(onComplete).toHaveBeenCalledWith('P45KRT');
  });

  it('gives the paste button a 44px touch target', () => {
    render(<JoinCodeField value="" onChange={() => {}} onPaste={() => {}} label="code" />);
    expect(screen.getByRole('button', { name: 'joinView.pasteCode' }).className).toMatch(/min-h-11|size-11|size-12|size-14/);
  });
});
