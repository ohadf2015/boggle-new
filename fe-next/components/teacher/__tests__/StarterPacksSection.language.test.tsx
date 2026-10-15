import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));

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
    expect(screen.getAllByRole('button')).toHaveLength(packsForLanguage('he').length);
  });
});
