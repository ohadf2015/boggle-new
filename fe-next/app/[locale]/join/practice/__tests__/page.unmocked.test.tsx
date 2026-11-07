import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));

import Page from '../page';

describe('/join/practice with the real practice round and no auth, query or other providers', () => {
  it('GIVEN a guest THEN the spelling round starts and shows a word prompt', async () => {
    render(await Page({ params: Promise.resolve({ locale: 'en' }) }));
    expect(screen.getByTestId('guest-practice-root')).toBeInTheDocument();
    expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0);
  });
});
