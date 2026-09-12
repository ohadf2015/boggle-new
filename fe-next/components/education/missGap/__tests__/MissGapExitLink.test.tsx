/**
 * @vitest-environment jsdom
 *
 * The teacher's way out of the homework tool.
 *
 * The route hides the global player bottom nav (see the route shell test for
 * why), which means this link is the ONLY wayfinding on the screen — so it has
 * to be a real, reachable control, not a ghost: cream fill on the navy surface
 * so it clears the 3:1 control rule, and a DirectionalIcon arrow that points at
 * the correct edge in Hebrew instead of pointing out of the page.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MissGapExitLink } from '../MissGapExitLink';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (key: string) => key }),
}));

describe('MissGapExitLink', () => {
  it('links back to the teacher dashboard in the active locale', () => {
    render(<MissGapExitLink locale="he" />);
    expect(screen.getByTestId('miss-gap-exit-link')).toHaveAttribute('href', '/he/teacher');
  });

  it('labels itself from the education namespace', () => {
    render(<MissGapExitLink locale="en" />);
    expect(screen.getByTestId('miss-gap-exit-link')).toHaveTextContent(
      'education.homework.backToDashboard',
    );
  });

  it('carries a filled, bordered edge — the only control on the screen cannot be a ghost', () => {
    render(<MissGapExitLink locale="en" />);
    const el = screen.getByTestId('miss-gap-exit-link');
    expect(el.className).toContain('bg-neo-cream');
    // border-neo is dropped by the cn()/tailwind-merge colour group, so the
    // width has to be written as an arbitrary value next to the colour.
    expect(el.className).toContain('border-[3px]');
  });

  it('flips its arrow in RTL', () => {
    const { container } = render(<MissGapExitLink locale="he" />);
    expect(container.querySelector('.rtl\\:rotate-180')).toBeTruthy();
  });
});
