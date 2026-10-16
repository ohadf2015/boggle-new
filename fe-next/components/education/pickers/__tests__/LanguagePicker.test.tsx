import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : k),
    language: 'en',
  }),
}));

import { LanguagePicker } from '../LanguagePicker';
import { EDUCATION_LANGUAGES } from '@/lib/supabase/education/types';

describe('LanguagePicker', () => {
  it('Given the default options, Then every education language is a radio with its native name', () => {
    render(<LanguagePicker label="Class language" value="en" onChange={vi.fn()} />);
    const group = screen.getByRole('radiogroup', { name: 'Class language' });
    const radios = within(group).getAllByRole('radio') as HTMLInputElement[];
    expect(radios.map((r) => r.value)).toEqual([...EDUCATION_LANGUAGES]);
    expect(within(group).getByRole('radio', { name: /עברית/ })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /日本語/ })).toBeInTheDocument();
  });

  it('Given a value, Then only that option is checked', () => {
    render(<LanguagePicker label="L" value="es" onChange={vi.fn()} />);
    expect(screen.getByRole('radio', { name: /Español/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /English/ })).not.toBeChecked();
  });

  it('When an option is picked, Then onChange gets its code', () => {
    const onChange = vi.fn();
    render(<LanguagePicker label="L" value="en" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /עברית/ }));
    expect(onChange).toHaveBeenCalledWith('he');
  });

  it('names the translated language too when it differs from the native one, so a teacher can read it', () => {
    render(<LanguagePicker label="L" value="en" onChange={vi.fn()} />);
    // languages.hebrew resolves to the raw key under this mock
    expect(screen.getByRole('radio', { name: /עברית.*languages\.hebrew/ })).toBeInTheDocument();
  });

  it('Given the dictionary hint, Then it explains what the language controls', () => {
    render(<LanguagePicker label="L" value="en" onChange={vi.fn()} showBoardHint />);
    expect(screen.getByText(/dictionary and board letters/i)).toBeInTheDocument();
  });

  it('Given an "all" option, Then it comes first and can be picked', () => {
    const onChange = vi.fn();
    render(<LanguagePicker label="L" value="all" onChange={onChange} allLabel="All languages" variant="filter" />);
    const radios = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(radios[0].value).toBe('all');
    expect(radios[0]).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Svenska/ }));
    expect(onChange).toHaveBeenCalledWith('sv');
  });

  it('never clips: options wrap instead of scrolling sideways and are not uppercased', () => {
    const { container } = render(<LanguagePicker label="L" value="all" onChange={vi.fn()} allLabel="All" variant="filter" />);
    const list = container.querySelector('[data-picker-options]') as HTMLElement;
    expect(list.className).toMatch(/flex-wrap/);
    expect(list.className).not.toMatch(/overflow-x-auto/);
    expect(container.innerHTML).not.toMatch(/\buppercase\b/);
  });

  it('gives tap targets of at least 44px in the regular variant and keeps a focus ring', () => {
    const { container } = render(<LanguagePicker label="L" value="en" onChange={vi.fn()} />);
    const option = container.querySelector('[data-picker-option="en"]') as HTMLElement;
    expect(option.className).toMatch(/min-h-(11|12|\[44px\]|\[48px\])/);
    expect(option.className).toMatch(/has-\[:focus-visible\]:ring/);
  });

  it('uses the selected look (lime fill + hard shadow) only on the checked option', () => {
    const { container } = render(<LanguagePicker label="L" value="he" onChange={vi.fn()} />);
    const he = container.querySelector('[data-picker-option="he"]') as HTMLElement;
    const en = container.querySelector('[data-picker-option="en"]') as HTMLElement;
    expect(he.className).toMatch(/bg-neo-lime/);
    expect(he.className).toMatch(/shadow-hard/);
    expect(en.className).not.toMatch(/bg-neo-lime/);
  });

  it('respects reduced motion on the press feedback', () => {
    const { container } = render(<LanguagePicker label="L" value="en" onChange={vi.fn()} />);
    const option = container.querySelector('[data-picker-option="en"]') as HTMLElement;
    expect(option.className).toMatch(/active:scale-\[0\.97\]/);
    expect(option.className).toMatch(/motion-reduce:/);
  });
});
