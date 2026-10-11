import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { HomeTreeBoot } from '../../homeTree';

vi.mock('@/utils/onboardingStorage', () => ({
  hasCompletedOnboarding: () => false,
  hasSupabaseSession: () => false,
}));

describe('returning home screen is one viewport', () => {
  it('hides the SEO/blog tail and the site footer for returning visitors only', () => {
    const { container } = render(<HomeTreeBoot />);
    const css = container.querySelector('style')?.textContent ?? '';
    expect(css).toContain('html[data-home="returning"] [data-home-tail="tail"]{display:none}');
    expect(css).toContain('html[data-home="returning"] footer{display:none}');
  });
});
