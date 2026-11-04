import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../LanguageContext';

const pushMock = vi.fn();
const replaceMock = vi.fn();
let mockPathname = '/en/education/live';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => mockPathname,
}));
vi.mock('../../translations/loadTranslation', () => ({
  loadTranslation: vi.fn(async () => ({ direction: 'ltr', flag: 'x' })),
  getCachedTranslation: vi.fn(() => undefined),
  seedTranslationCache: vi.fn(),
}));

describe('LanguageContext keeps the query string across a language switch', () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
    localStorage.clear();
    mockPathname = '/en/education/live';
    window.history.replaceState(null, '', '/en/education/live?room=ABC');
  });
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('a student switching language in a live room stays in the room', async () => {
    const ref: { current: ReturnType<typeof useLanguage> | null } = { current: null };
    function Capture() {
      const value = useLanguage();
      React.useEffect(() => {
        ref.current = value;
      });
      return null;
    }
    render(
      <LanguageProvider initialLanguage="en">
        <Capture />
      </LanguageProvider>,
    );
    await waitFor(() => expect(ref.current).not.toBeNull());
    await act(async () => {
      ref.current!.setLanguage('he');
    });
    expect(pushMock).toHaveBeenCalledWith('/he/education/live?room=ABC');
  });

  it('an explicit saved language that differs from the URL keeps ?from= when it rewrites on load', async () => {
    mockPathname = '/en/education/access';
    window.history.replaceState(null, '', '/en/education/access?from=teacher');
    localStorage.setItem('boggle_language', 'ru');
    localStorage.setItem('boggle_language_explicit', '1');
    render(<LanguageProvider initialLanguage="en"><span /></LanguageProvider>);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/ru/education/access?from=teacher'));
  });
});
