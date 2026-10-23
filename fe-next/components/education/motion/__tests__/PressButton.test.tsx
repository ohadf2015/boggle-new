import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PressButton, pressClasses } from '../PressButton';

const tokens = (s: string) => s.split(/\s+/);

describe('pressClasses', () => {
  it('draws a 4px vertical lip that the button sinks into on press', () => {
    const c = tokens(pressClasses(4));
    expect(c).toEqual(expect.arrayContaining(['shadow-[0_4px_0_0]', 'shadow-neo-black', 'active:translate-y-[4px]', 'active:shadow-none']));
  });

  it('uses a 2px lip for small buttons', () => {
    const c = tokens(pressClasses(2));
    expect(c).toEqual(expect.arrayContaining(['shadow-[0_2px_0_0]', 'active:translate-y-[2px]', 'active:shadow-none']));
    expect(c).not.toContain('active:translate-y-[4px]');
  });

  it('sinks instantly: no transition on transform or shadow', () => {
    const c = tokens(pressClasses(4));
    expect(c.filter((t) => /^transition(-all|-transform|-shadow)?$|^transition-\[.*(transform|shadow)/.test(t))).toEqual([]);
  });

  it('only brightens on hover where hover exists, so touch never sticks', () => {
    expect(pressClasses(4)).toContain('[@media(hover:hover)]:hover:brightness-110');
  });

  it('keeps the lip vertical, so the RTL diagonal-shadow flip never applies', () => {
    expect(pressClasses(4)).not.toMatch(/shadow-hard/);
  });
});

describe('PressButton', () => {
  it('renders a button with the press classes and forwards clicks', () => {
    const onClick = vi.fn();
    render(
      <PressButton lip={2} className="bg-neo-lime" onClick={onClick}>
        edu.go
      </PressButton>,
    );
    const btn = screen.getByRole('button', { name: 'edu.go' });
    expect(btn.className).toContain('active:translate-y-[2px]');
    expect(btn.className).toContain('bg-neo-lime');
    expect(btn.getAttribute('type')).toBe('button');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
