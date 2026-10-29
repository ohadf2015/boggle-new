import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string, f?: unknown) => (typeof f === 'string' ? f : k), language: 'en' }) }));

import { StarterPacksSection, packsForLanguage } from '../StarterPacksSection';
import { STARTER_LESSON_PACKS } from '@/lib/education/starterLessonPacks';

describe('starter packs follow the class language', () => {
  it('Given a Hebrew class, Then only Hebrew packs are offered', () => {
    const packs = packsForLanguage('he');
    expect(packs.length).toBeGreaterThan(0);
    expect(packs.every((p) => p.language === 'he')).toBe(true);
  });

  it('Given a language with no packs, Then every pack is offered rather than none', () => {
    expect(packsForLanguage('xx')).toHaveLength(STARTER_LESSON_PACKS.length);
    expect(packsForLanguage(undefined)).toHaveLength(STARTER_LESSON_PACKS.length);
  });

  it('Given the section with a language, Then it renders that language’s packs only', () => {
    render(<StarterPacksSection onSelectPack={vi.fn()} language="he" />);
    const region = screen.getByRole('region', { name: 'education.starterPacks.title' });
    expect(within(region).getAllByRole('button')).toHaveLength(packsForLanguage('he').length);
  });

  it('Given a Hebrew-default class that also teaches English, Then a chip row offers both, starting on Hebrew, and switching shows English packs', () => {
    render(<StarterPacksSection onSelectPack={vi.fn()} language="he" languages={['en']} />);
    const chips = within(screen.getByTestId('starter-packs-language'));
    expect(chips.getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['he', 'en']);
    expect(chips.getByRole('radio', { name: /עברית/ })).toBeChecked();
    fireEvent.click(chips.getByRole('radio', { name: /English/ }));
    const region = screen.getByRole('region', { name: 'education.starterPacks.title' });
    expect(within(region).getAllByRole('button')).toHaveLength(packsForLanguage('en').length);
  });
});
