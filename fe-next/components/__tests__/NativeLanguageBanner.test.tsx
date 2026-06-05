import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NativeLanguageBanner } from '../NativeLanguageBanner';

const mockSetLanguage = vi.fn();
let mockLanguage = 'en';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({ language: mockLanguage, setLanguage: mockSetLanguage }),
}));

// framer-motion: render children plainly, drop animation-only props.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy(
    {},
    {
      get: () => {
        return ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
          const { initial, animate, exit, transition, ...rest } = props;
          void initial; void animate; void exit; void transition;
          return <div {...(rest as Record<string, unknown>)}>{children}</div>;
        };
      },
    },
  ),
}));

function setBrowserLanguages(langs: string[]) {
  Object.defineProperty(navigator, 'languages', { get: () => langs, configurable: true });
}

describe('NativeLanguageBanner', () => {
  beforeEach(() => {
    mockSetLanguage.mockReset();
    mockLanguage = 'en';
    localStorage.clear();
    document.documentElement.className = '';
  });

  afterEach(() => {
    // Drop our `navigator.languages` override so it can't leak into whatever
    // test file vitest runs next in this worker (the prototype getter returns).
    delete (navigator as { languages?: readonly string[] }).languages;
  });

  it('offers the native language when the browser prefers a supported one we are not showing', () => {
    // App is English (e.g. forced by a stale boggle_language=en cookie) while
    // the player's top browser preference is Spanish — Chrome would otherwise
    // machine-translate. Offer our native Spanish instead.
    setBrowserLanguages(['es-US', 'es', 'en-US']);
    render(<NativeLanguageBanner />);
    // Offer shown in Spanish, in the user's preferred language.
    expect(screen.getByText('¿Prefieres jugar en Español?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar' })).toBeInTheDocument();
  });

  it('switches to the native language when the user accepts', () => {
    setBrowserLanguages(['es-US', 'es', 'en-US']);
    render(<NativeLanguageBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }));
    expect(mockSetLanguage).toHaveBeenCalledWith('es');
  });

  it('hides and remembers the dismissal when the user declines', () => {
    setBrowserLanguages(['es-US', 'es', 'en-US']);
    const { rerender } = render(<NativeLanguageBanner />);
    fireEvent.click(screen.getByRole('button', { name: 'No, gracias' }));
    expect(screen.queryByText('¿Prefieres jugar en Español?')).not.toBeInTheDocument();
    // Dismissal persists across remounts (no nagging on every load).
    rerender(<NativeLanguageBanner />);
    expect(screen.queryByText('¿Prefieres jugar en Español?')).not.toBeInTheDocument();
    expect(mockSetLanguage).not.toHaveBeenCalled();
  });

  it('renders nothing when the app is already in the preferred language', () => {
    mockLanguage = 'es';
    setBrowserLanguages(['es-MX', 'es']);
    const { container } = render(<NativeLanguageBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the browser preference is unsupported', () => {
    setBrowserLanguages(['fr-FR', 'de']);
    const { container } = render(<NativeLanguageBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks itself translate="no" so the browser does not re-translate the offer', () => {
    setBrowserLanguages(['es-US', 'es', 'en-US']);
    render(<NativeLanguageBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('translate', 'no');
    expect(banner.className).toContain('notranslate');
  });
});
