import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

let pathname = '/he/pricing';
let language = 'he';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => `T:${k}`, language }),
}));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

import { EducationBreadcrumbs } from '../EducationBreadcrumbs';

describe('EducationBreadcrumbs pricing crumb', () => {
  it('Given /he/pricing, Then the current crumb is the translated pricing label, not the raw slug', () => {
    pathname = '/he/pricing';
    language = 'he';
    render(<EducationBreadcrumbs />);
    const current = document.querySelector('[aria-current="page"]');
    expect(current).toHaveTextContent('T:education.header.breadcrumbs.pricing');
    expect(screen.queryByText(/^pricing$/)).not.toBeInTheDocument();
  });

  it('has a pricing breadcrumb label in every locale', async () => {
    for (const l of ['en', 'he', 'es', 'sv', 'ja', 'ru']) {
      const mod = await import(`../../../translations/${l}.js`);
      const root = (mod.default ?? mod) as Record<string, any>;
      const dict = (root[l] ?? root) as Record<string, any>;
      const label = dict?.education?.header?.breadcrumbs?.pricing;
      expect(typeof label, l).toBe('string');
      expect(label.length, l).toBeGreaterThan(0);
    }
  });
});
