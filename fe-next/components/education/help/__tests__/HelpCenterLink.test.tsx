// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'he',
    t: (key: string) => `t:${key}`,
  }),
}));

import { HelpCenterLink } from '../HelpCenterLink';

describe('HelpCenterLink', () => {
  it('links to the help center in the reader language with translated copy', () => {
    const { container, getByText } = render(<HelpCenterLink />);
    expect(container.querySelector('a[href="/he/education/help"]')).not.toBeNull();
    expect(getByText('t:eg2Help.link.title')).toBeTruthy();
  });

  it('renders a compact footer variant', () => {
    const { container } = render(<HelpCenterLink variant="inline" />);
    expect(container.querySelector('a[href="/he/education/help"]')?.textContent).toContain('t:eg2Help.link.title');
  });
});
