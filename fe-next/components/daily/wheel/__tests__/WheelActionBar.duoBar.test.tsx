import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WheelActionBar from '../WheelActionBar';

const base = { t: (k: string) => k, hasLetters: true, canSubmit: true, isValidating: false, onClear: vi.fn(), onSubmit: vi.fn(), onBackspace: vi.fn() };
const submit = () => screen.getByRole('button', { name: 'wordWheel.submit' });

describe('WheelActionBar: a compact chunky SUBMIT between two square icon buttons', () => {
  it('keeps the compact proportions: SUBMIT sized by its label, never a full-width slab', () => {
    render(<WheelActionBar {...base} />);
    expect(submit().className).not.toContain('flex-1');
    for (const name of ['wordWheel.clear', 'wordWheel.removeLetter']) {
      expect(screen.getByRole('button', { name }).className).toContain('size-12');
    }
  });

  it('empty is still a live game button: navy fill, cream text, hard lip, no dimming', () => {
    render(<WheelActionBar {...base} canSubmit={false} hasLetters={false} />);
    expect(submit()).toHaveAttribute('data-ready', 'false');
    expect(submit().className).toContain('bg-neo-navy-light');
    expect(submit().className).toContain('text-neo-cream');
    expect(submit().className).toContain('shadow-[0_4px_0_rgb(var(--neo-black))]');
    for (const b of screen.getAllByRole('button')) expect(b.className).not.toMatch(/opacity-|\/30|\/40/);
  });

  it('a ready word turns SUBMIT lime, keeping the lip', () => {
    render(<WheelActionBar {...base} />);
    expect(submit()).toHaveAttribute('data-ready', 'true');
    expect(submit().className).toContain('bg-neo-lime');
    expect(submit().className).toContain('shadow-[0_4px_0_rgb(var(--neo-black))]');
  });

  it('backspace icon mirrors in RTL', () => {
    render(<WheelActionBar {...base} />);
    const icon = screen.getByRole('button', { name: 'wordWheel.removeLetter' }).querySelector('svg');
    expect(icon?.getAttribute('class')).toContain('rtl:-scale-x-100');
  });
});
