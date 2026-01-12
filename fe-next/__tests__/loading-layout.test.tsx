/**
 * Test for loading state layout consistency
 * Ensures loading.tsx uses the same modern layout approach as the landing page
 */
import { render } from '@testing-library/react';
import Loading from '@/app/[locale]/loading';

describe('Loading Layout', () => {
  it('should use modern screen-fit layout instead of old min-h-screen', () => {
    const { container } = render(<Loading />);

    const loadingContainer = container.firstChild as HTMLElement;

    // Should NOT use old min-h-screen approach
    expect(loadingContainer.className).not.toContain('min-h-screen');

    // Should use modern layout approach
    expect(loadingContainer.className).toContain('screen-fit');
  });

  it('should have proper background styling consistent with landing page', () => {
    const { container } = render(<Loading />);

    const loadingContainer = container.firstChild as HTMLElement;

    // Should use neo-brutalist background consistent with landing page
    expect(loadingContainer.className).toContain('bg-neo-navy');
  });

  it('should maintain neo-brutalist design system colors for loading dots', () => {
    const { container } = render(<Loading />);

    // All three dots should use the Phase 4 design system colors
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);

    // Check for Phase 4 colors
    expect(dots[0].className).toContain('bg-neo-lime');
    expect(dots[1].className).toContain('bg-neo-cyan');
    expect(dots[2].className).toContain('bg-neo-pink');
  });

  it('should have staggered animation delays for visual appeal', () => {
    const { container } = render(<Loading />);

    const dots = container.querySelectorAll('.animate-bounce') as NodeListOf<HTMLElement>;

    // Each dot should have a different animation delay
    expect(dots[0].style.animationDelay).toBe('0ms');
    expect(dots[1].style.animationDelay).toBe('150ms');
    expect(dots[2].style.animationDelay).toBe('300ms');
  });
});
