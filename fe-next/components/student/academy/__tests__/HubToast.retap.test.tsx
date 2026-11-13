import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LazyMotion, domAnimation } from 'framer-motion';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ fill: _f, unoptimized: _u, ...p }: Record<string, unknown>) => React.createElement('img', p as never),
}));

import { HubToast, type HubNote } from '../HubToast';

const renderToast = (note: HubNote) => (
  <LazyMotion features={domAnimation}>
    <HubToast reward={null} note={note} onDismiss={vi.fn()} reducedMotion rail={false} />
  </LazyMotion>
);

describe('HubToast re-tap', () => {
  it('GIVEN the waiting-arena note is up WHEN the student taps the arena again THEN the note pops again', () => {
    const { rerender } = render(renderToast({ kind: 'arena', tap: 0 }));
    const first = screen.getByTestId('hub-note-body');
    rerender(renderToast({ kind: 'arena', tap: 1 }));
    expect(screen.getByTestId('hub-note-body')).not.toBe(first);
  });

  it('GIVEN the same tap WHEN the hub re-renders THEN the note stays put', () => {
    const { rerender } = render(renderToast({ kind: 'arena', tap: 2 }));
    const first = screen.getByTestId('hub-note-body');
    rerender(renderToast({ kind: 'arena', tap: 2 }));
    expect(screen.getByTestId('hub-note-body')).toBe(first);
  });
});
