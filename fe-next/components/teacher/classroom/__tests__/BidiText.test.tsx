import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

let uiDir: 'ltr' | 'rtl' = 'ltr';
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ dir: uiDir }) }));

import { BidiText, bidiDir, isolateBidi } from '../BidiText';

describe('bidiDir', () => {
  it('Given a single-script name, Then the browser picks its direction', () => {
    expect(bidiDir('Period 3', 'rtl')).toBe('auto');
    expect(bidiDir('ימים', 'ltr')).toBe('auto');
  });

  it('Given Hebrew and Latin in one name, Then the page direction wins, not the first letter', () => {
    expect(bidiDir('כיתה: words to re-learn (10/24/2026)', 'ltr')).toBe('ltr');
    expect(bidiDir('words to re-learn: כיתה', 'rtl')).toBe('rtl');
  });
});

describe('BidiText', () => {
  it('Given a mixed name on an English page, Then it renders as one left-to-right run', () => {
    uiDir = 'ltr';
    render(<BidiText data-testid="n">כיתה: words to re-learn (10/24/2026)</BidiText>);
    expect(screen.getByTestId('n')).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('n')).toHaveTextContent('כיתה: words to re-learn (10/24/2026)');
  });
});

describe('isolateBidi', () => {
  it('wraps a user value in first-strong isolates so it cannot reorder its neighbours', () => {
    expect(isolateBidi('כיתה ה')).toBe('⁨כיתה ה⁩');
  });
});
