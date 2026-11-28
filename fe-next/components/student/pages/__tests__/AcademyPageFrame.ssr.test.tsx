import React from 'react';
import { renderToString } from 'react-dom/server';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AcademyPageFrame } from '../AcademyPageFrame';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', dir: 'ltr', t: (key: string, fallback?: string) => fallback ?? key }),
}));
vi.mock('@/components/student/academy/AcademyDock', () => ({ AcademyDock: () => <nav data-testid="dock" /> }));
vi.mock('@/components/student/academy/AcademyBackdrop', () => ({ AcademyBackdrop: () => null }));
vi.mock('@/components/student/academy/AcademyPlaque', () => ({ AcademyPlaque: () => <div /> }));

const frame = (
  <AcademyPageFrame title="Lessons" art="/a.webp" regionLabel="Lessons">
    <p>list</p>
  </AcademyPageFrame>
);

describe('AcademyPageFrame first paint', () => {
  it('server-renders the frame hidden, since the server cannot know the viewport it would lay out for', () => {
    // Given the frame rendered on the server (phone-sized guess)
    const html = renderToString(frame);

    // Then the guessed layout is not painted, so the real one does not jump in after hydration
    expect(html).toMatch(/visibility:\s*hidden/);
  });

  it('shows the frame once the client has measured the viewport', () => {
    // Given the frame mounted in a browser
    render(frame);

    // Then it is visible
    expect(screen.getByTestId('academy-page-scroll').parentElement?.parentElement).not.toHaveStyle({ visibility: 'hidden' });
  });
});
