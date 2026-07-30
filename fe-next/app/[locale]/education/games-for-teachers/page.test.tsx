// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page from './page';

describe('games-for-teachers page', () => {
  it('renders a district/school upsell CTA linking to for-schools lead form', async () => {
    const { container } = render(
      await Page({ params: Promise.resolve({ locale: 'en' }) })
    );
    const districtLink = container.querySelector('a[href="/en/education/for-schools"]');
    expect(districtLink).not.toBeNull();
  });
});
