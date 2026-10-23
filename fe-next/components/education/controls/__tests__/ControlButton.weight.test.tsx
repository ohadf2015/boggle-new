import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ControlButton } from '@/components/education/controls/ControlButton';

afterEach(cleanup);

const button = (tone: 'danger' | 'neutral' | 'time' | 'armed') => {
  render(<ControlButton tone={tone} icon={<svg />} label="End round" onClick={vi.fn()} testId={`b-${tone}`} />);
  return screen.getByTestId(`b-${tone}`);
};

describe('ControlButton — destructive vs harmless weight', () => {
  it('given End round, when idle, then it is an outline with a danger edge and icon, not a filled slab', () => {
    const el = button('danger');
    expect(el.className).toContain('border-neo-red');
    expect(el.className).toContain('[&_svg]:text-neo-red');
    expect(el.className).not.toContain('bg-neo-pink');
  });

  it('given Pause and +30s, then both are the same neutral fill', () => {
    const pause = button('neutral').className.match(/bg-neo-[a-z-]+/)?.[0];
    const time = button('time').className.match(/bg-neo-[a-z-]+/)?.[0];
    expect(pause).toBe(time);
  });

  it('given the armed confirm, then it becomes the one filled destructive control', () => {
    expect(button('armed').className).toContain('bg-neo-red');
  });

  it('given a projector width, then a long label wraps instead of being cut off', () => {
    button('neutral');
    const label = screen.getByText('End round').className;
    expect(label).not.toContain('whitespace-nowrap');
    expect(label).toContain('lg:line-clamp-none');
  });
});
