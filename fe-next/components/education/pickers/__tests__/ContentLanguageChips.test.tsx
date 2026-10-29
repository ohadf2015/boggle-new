import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : k), language: 'en' }),
}));

import { ContentLanguageChips, contentLanguagesFor } from '../ContentLanguageChips';

const values = () => screen.getAllByRole('radio').map((r) => (r as HTMLInputElement).value);

describe('ContentLanguageChips', () => {
  it('lists the class default first, then the other languages the teacher has lists in, once each', () => {
    expect(contentLanguagesFor('he', ['en', 'he', 'en', 'xx', null])).toEqual(['he', 'en']);
    expect(contentLanguagesFor(null, [])).toEqual(['en']);
  });

  it('Given the class languages, Then only those are chips until "Add language" opens the rest', () => {
    const onChange = vi.fn();
    render(<ContentLanguageChips label="Language" languages={['he', 'en']} value="he" onChange={onChange} />);
    expect(values()).toEqual(['he', 'en']);
    fireEvent.click(screen.getByRole('button', { name: /add language/i }));
    expect(values()).toEqual(['he', 'en', 'sv', 'ja', 'es', 'ru']);
    fireEvent.click(screen.getByRole('radio', { name: /Svenska/ }));
    expect(onChange).toHaveBeenCalledWith('sv');
  });

  it('Given a picked language outside the class set, Then it stays visible as a chip', () => {
    render(<ContentLanguageChips label="Language" languages={['en']} value="ja" onChange={vi.fn()} />);
    expect(values()).toEqual(['en', 'ja']);
    expect(within(screen.getByRole('radiogroup')).getByRole('radio', { name: /日本語/ })).toBeChecked();
  });

  it('Given every language is already a chip, Then there is no add button', () => {
    render(<ContentLanguageChips label="Language" languages={['en', 'he', 'sv', 'ja', 'es', 'ru']} value="en" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /add language/i })).toBeNull();
  });
});
