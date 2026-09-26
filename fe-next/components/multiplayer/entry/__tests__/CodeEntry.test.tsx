/**
 * JOIN BY CODE (DESIGN §b.1): six boxes, auto-advance, paste, auto-submit on the
 * sixth character. Codes are upper-case alphanumerics (generateGameCode) but the
 * server accepts up to 10 — a longer pasted code is submitted whole, never cut
 * to six and fired.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${p.n}` : k), language: 'en', dir: 'ltr' }),
}));

import { CodeEntry, CODE_LENGTH } from '../CodeEntry';

const boxes = () => screen.getAllByRole('textbox') as HTMLInputElement[];
const paste = (el: HTMLElement, text: string) =>
  fireEvent.paste(el, { clipboardData: { getData: () => text } });

describe('CodeEntry', () => {
  it('renders one box per code character', () => {
    render(<CodeEntry onSubmit={vi.fn()} />);
    expect(boxes()).toHaveLength(CODE_LENGTH);
    expect(CODE_LENGTH).toBe(6);
  });

  it('typing upper-cases, advances focus and auto-submits on the sixth character', () => {
    const onSubmit = vi.fn();
    render(<CodeEntry onSubmit={onSubmit} />);
    'abc12'.split('').forEach((ch, i) => fireEvent.change(boxes()[i], { target: { value: ch } }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(boxes()[5]);
    fireEvent.change(boxes()[5], { target: { value: 'z' } });
    expect(onSubmit).toHaveBeenCalledWith('ABC12Z');
    expect(boxes().map((b) => b.value).join('')).toBe('ABC12Z');
  });

  it('ignores characters a room code can never contain', () => {
    const onSubmit = vi.fn();
    render(<CodeEntry onSubmit={onSubmit} />);
    fireEvent.change(boxes()[0], { target: { value: '#' } });
    expect(boxes()[0].value).toBe('');
    expect(document.activeElement).not.toBe(boxes()[1]);
  });

  it('Backspace on an empty box steps back and clears it', () => {
    render(<CodeEntry onSubmit={vi.fn()} />);
    fireEvent.change(boxes()[0], { target: { value: 'Q' } });
    fireEvent.keyDown(boxes()[1], { key: 'Backspace' });
    expect(document.activeElement).toBe(boxes()[0]);
    expect(boxes()[0].value).toBe('');
  });

  it('pasting a full code fills the boxes and submits it', () => {
    const onSubmit = vi.fn();
    render(<CodeEntry onSubmit={onSubmit} />);
    paste(boxes()[0], ' xw-uct4\n');
    expect(onSubmit).toHaveBeenCalledWith('XWUCT4');
  });

  it('pasting a partial code fills what it has and waits', () => {
    const onSubmit = vi.fn();
    render(<CodeEntry onSubmit={onSubmit} />);
    paste(boxes()[0], 'ab1');
    expect(boxes().map((b) => b.value).join('')).toBe('AB1');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(boxes()[3]);
  });

  it('a longer pasted code is submitted whole, never truncated', () => {
    const onSubmit = vi.fn();
    render(<CodeEntry onSubmit={onSubmit} />);
    paste(boxes()[0], 'ABCD123456');
    expect(onSubmit).toHaveBeenCalledWith('ABCD123456');
  });

  it('boxes are disabled while a join is in flight', () => {
    render(<CodeEntry onSubmit={vi.fn()} busy />);
    boxes().forEach((b) => expect(b).toBeDisabled());
  });

  it('a join that fails (busy ends while still on entry) clears the boxes and refocuses the first', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(<CodeEntry onSubmit={onSubmit} />);
    paste(boxes()[0], 'XWUCT4');
    rerender(<CodeEntry onSubmit={onSubmit} busy />);
    rerender(<CodeEntry onSubmit={onSubmit} busy={false} />);
    expect(boxes().map((b) => b.value).join('')).toBe('');
    expect(document.activeElement).toBe(boxes()[0]);
  });

  it('labels every box for screen readers', () => {
    render(<CodeEntry onSubmit={vi.fn()} />);
    expect(boxes()[2].getAttribute('aria-label')).toBe('mpUi.entry.codeAria:3');
  });
});
