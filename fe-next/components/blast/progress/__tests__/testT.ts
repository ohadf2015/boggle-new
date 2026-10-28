import { vi } from 'vitest';

export const fakeT = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}${JSON.stringify(params)}` : key;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: fakeT, language: 'en', dir: 'ltr' }),
}));
