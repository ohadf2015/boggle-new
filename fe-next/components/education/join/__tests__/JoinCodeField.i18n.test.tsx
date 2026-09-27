import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => (k === 'joinView.pasteCode' ? 'הדבק' : k), dir: 'rtl' }),
}));

import { JoinCodeField } from '../JoinCodeField';

describe('JoinCodeField paste button', () => {
  it('names the paste button in the student language, not hardcoded English', () => {
    render(<JoinCodeField value="" onChange={() => {}} onPaste={() => {}} />);
    const btn = screen.getByRole('button', { name: 'הדבק' });
    expect(btn).toHaveAttribute('title', 'הדבק');
  });
});
