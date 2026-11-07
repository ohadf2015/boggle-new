import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const search = vi.hoisted(() => ({ value: 'preview=ready&words=apple,banana,cherry,grape&count=0' }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search.value) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k) }),
}));
vi.mock('@/components/education/shell/EducationShell', () => ({ EducationShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/education/EduMascot', () => ({ EduMascot: () => null }));

import ClassReadyPreview from '../ClassReadyPreview';

describe('ClassReadyPreview (dev only)', () => {
  it('Given words in the URL, Then the real ready screen shows a code, those words counted and Play now, with no network', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<ClassReadyPreview />);
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent(/\w{4,}/);
    expect(screen.getByTestId('first-game-count')).toHaveTextContent('eduShell.setup.words.count:{"count":4}');
    expect(screen.getByTestId('setup-play-now')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
