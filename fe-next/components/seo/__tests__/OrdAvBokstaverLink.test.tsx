import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  OrdAvBokstaverLink,
  ORD_AV_BOKSTAVER_HREF,
  ORD_AV_BOKSTAVER_QUERY,
} from '../OrdAvBokstaverLink';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe('OrdAvBokstaverLink', () => {
  it('links the exact search to the Swedish word solver', () => {
    render(<OrdAvBokstaverLink lead="Har du bokstäver?" />);
    const link = screen.getByRole('link', { name: ORD_AV_BOKSTAVER_QUERY });
    expect(link).toHaveAttribute('href', '/sv/tools/word-solver');
    expect(ORD_AV_BOKSTAVER_HREF).toBe('/sv/tools/word-solver');
  });

  it('is mounted on the Swedish homepage', () => {
    const home = readFileSync(path.resolve(__dirname, '../../landing/LandingSEOSection.tsx'), 'utf8');
    expect(home).toContain('OrdAvBokstaverLink');
    expect(home).toContain("locale === 'sv'");
  });
});
