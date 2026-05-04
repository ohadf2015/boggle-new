import { render, screen } from '@testing-library/react';
import { KeyboardHintStrip } from '../KeyboardHintStrip';
import { vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        'mp.kbHint.submit': 'submit',
        'mp.kbHint.pop': 'remove last',
        'mp.kbHint.clear': 'clear',
      };
      return map[k] ?? k;
    },
    language: 'en',
  }),
}));

describe('KeyboardHintStrip', () => {
  it('renders Enter, Backspace, Esc kbd chips', () => {
    render(<KeyboardHintStrip />);
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Backspace')).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
  });

  it('renders translated label text', () => {
    render(<KeyboardHintStrip />);
    expect(screen.getByTestId('kb-hint-submit')).toHaveTextContent(/submit/i);
    expect(screen.getByTestId('kb-hint-pop')).toHaveTextContent(/remove last/i);
    expect(screen.getByTestId('kb-hint-clear')).toHaveTextContent(/clear/i);
  });
});
