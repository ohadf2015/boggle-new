import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NoAccountCta } from '../NoAccountCta';
import { TeacherProCheckoutCta } from '../TeacherProCheckoutCta';

// Both blocks sit inside page heroes (16 landings, the hub, for-schools). As
// border-4 + shadow-hard-lg saturated slabs they read as ads and out-shouted the
// H1. One compact "ticket" treatment for both.
describe('education CTA tickets', () => {
  const cases = [
    ['NoAccountCta', () => render(<NoAccountCta locale="en" />), 'neo-lime'],
    ['TeacherProCheckoutCta', () => render(<TeacherProCheckoutCta locale="en" />), 'neo-pink'],
  ] as const;

  it.each(cases)('%s is a navy ticket with an accent start edge, not a filled slab', (_n, mount, accent) => {
    const { container } = mount();
    const box = container.firstElementChild as HTMLElement;
    expect(box.className).toContain('bg-neo-navy-light');
    expect(box.className).toContain(`border-s-${accent}`);
    expect(box.className).not.toContain('shadow-hard-lg');
    expect(box.className).not.toMatch(/(^|\s)border-4(\s|$)/);
    expect(box.className).not.toMatch(/(^|\s)bg-neo-(lime|pink)(\s|$)/);
  });

  it.each(cases)('%s keeps its fine print readable (no 10px widest-tracked note)', (_n, mount) => {
    const { container } = mount();
    expect(container.innerHTML).not.toContain('text-[10px]');
    expect(container.innerHTML).not.toContain('tracking-widest');
  });

  // #ff1493 with white 14px text is 3.64:1; the pink button carries navy ink (4.76:1).
  // Heading on #16213e: neo-pink #ff1493 is 4.37:1 (fails at 16-18px bold);
  // neo-pink-light #ff6bb8 is ~6.0:1.
  it('uses the light pink for the Teacher Pro heading on navy', () => {
    render(<TeacherProCheckoutCta locale="en" />);
    const heading = screen.getByText(/Teacher Pro — \$/, { selector: 'p' });
    expect(heading.className).toContain('text-neo-pink-light');
  });

  it('puts navy ink on the pink Teacher Pro button', () => {
    render(<TeacherProCheckoutCta locale="en" />);
    const link = screen.getByTestId('teacher-pro-checkout-link');
    expect(link.className).toContain('bg-neo-pink');
    expect(link.className).toContain('text-neo-navy');
  });
});
