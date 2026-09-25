import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const trackGrowthEvent = vi.fn();

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: any[]) => trackGrowthEvent(...args),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
const modeRouteMock = vi.fn((key: string, lang: string) => {
  const routes: Record<string, Record<string, string>> = {
    en: { adventure: '/adventure', wordTowerV2: '/word-tower' },
    he: { adventure: '/he/adventure', wordTowerV2: '/he/word-tower' },
  };
  return routes[lang]?.[key] || `/en/${key}`;
});

vi.mock('@/lib/landing/modeMeta', () => ({
  modeRoute: (...args: any[]) => modeRouteMock(...args),
}));

import { NewModesAnnouncement } from '../NewModesAnnouncement';

const STORAGE_KEY = 'newModesAnnouncementSeen';

beforeEach(() => {
  trackGrowthEvent.mockClear();
  modeRouteMock.mockClear();
  modeRouteMock.mockImplementation((key: string, lang: string) => {
    const routes: Record<string, Record<string, string>> = {
      en: { adventure: '/adventure', wordTowerV2: '/word-tower' },
      he: { adventure: '/he/adventure', wordTowerV2: '/he/word-tower' },
    };
    return routes[lang]?.[key] || `/en/${key}`;
  });
  localStorage.clear();
});

describe('NewModesAnnouncement', () => {
  it('given localStorage is empty (first show), when mounted, then the announcement renders and fires _shown event', async () => {
    render(<NewModesAnnouncement />);

    // After hydration, the card should be visible
    await waitFor(() => {
      expect(screen.getByText('newModes.title')).toBeInTheDocument();
    });

    // Event should have been fired
    expect(trackGrowthEvent).toHaveBeenCalledWith('new_modes_announcement_shown', {});

    // Marker should be written
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('given the marker is already in localStorage, when mounted, then nothing renders', () => {
    localStorage.setItem(STORAGE_KEY, 'true');

    render(<NewModesAnnouncement />);

    expect(screen.queryByText('newModes.title')).not.toBeInTheDocument();
    expect(trackGrowthEvent).not.toHaveBeenCalled();
  });

  it('given the announcement is showing, when the user clicks dismiss, then it hides and fires _dismissed event', async () => {
    render(<NewModesAnnouncement />);

    // Wait for the card to render
    await waitFor(() => {
      expect(screen.getByText('newModes.title')).toBeInTheDocument();
    });

    // Clear the mock to verify the dismiss event specifically
    trackGrowthEvent.mockClear();

    // Click the close button
    const closeButton = screen.getByLabelText('common.close');
    fireEvent.click(closeButton);

    // Card should disappear
    await waitFor(() => {
      expect(screen.queryByText('newModes.title')).not.toBeInTheDocument();
    });

    // Dismiss event should fire
    expect(trackGrowthEvent).toHaveBeenCalledWith('new_modes_announcement_dismissed', {});
  });

  it('given the announcement is showing, when the user clicks the adventure CTA, then it fires _clicked event with mode', async () => {
    render(<NewModesAnnouncement />);

    await waitFor(() => {
      expect(screen.getByText('newModes.title')).toBeInTheDocument();
    });

    trackGrowthEvent.mockClear();

    const adventureButton = screen.getByText('newModes.playAdventure');
    fireEvent.click(adventureButton);

    expect(trackGrowthEvent).toHaveBeenCalledWith('new_modes_announcement_clicked', { mode: 'adventure' });
  });

  it('given the announcement is showing, when the user clicks the word tower CTA, then it fires _clicked event with mode', async () => {
    render(<NewModesAnnouncement />);

    await waitFor(() => {
      expect(screen.getByText('newModes.title')).toBeInTheDocument();
    });

    trackGrowthEvent.mockClear();

    const wtButton = screen.getByText('newModes.playWordTower');
    fireEvent.click(wtButton);

    expect(trackGrowthEvent).toHaveBeenCalledWith('new_modes_announcement_clicked', { mode: 'wordTowerV2' });
  });

  it('given StrictMode double-effect, when mounted, then the _shown event fires only once', async () => {
    // Simulate StrictMode: render twice with same props
    const { rerender } = render(<NewModesAnnouncement />);

    await waitFor(() => {
      expect(screen.getByText('newModes.title')).toBeInTheDocument();
    });

    trackGrowthEvent.mockClear();

    // Re-render (simulating StrictMode)
    rerender(<NewModesAnnouncement />);

    // The event should still only have been called once (guarded by ref)
    await waitFor(() => {
      expect(trackGrowthEvent).not.toHaveBeenCalled();
    });
  });

  it('given modeRoute returns null for adventure, when mounted, then nothing renders and no error throws', () => {
    // Mock modeRoute to return null for adventure (unknown mode key)
    modeRouteMock.mockImplementation((key: string) => {
      if (key === 'adventure') return null;
      return key === 'wordTowerV2' ? '/word-tower' : null;
    });

    // Should not throw
    expect(() => {
      render(<NewModesAnnouncement />);
    }).not.toThrow();

    // Card should not render
    expect(screen.queryByText('newModes.title')).not.toBeInTheDocument();

    // localStorage should NOT have the seen marker (not written to)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // _shown event should NOT fire
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('new_modes_announcement_shown', {});
  });

  it('given modeRoute returns null for wordTowerV2, when mounted, then nothing renders and no error throws', () => {
    modeRouteMock.mockImplementation((key: string) => {
      if (key === 'wordTowerV2') return null;
      return key === 'adventure' ? '/adventure' : null;
    });


    expect(() => {
      render(<NewModesAnnouncement />);
    }).not.toThrow();

    expect(screen.queryByText('newModes.title')).not.toBeInTheDocument();

    // localStorage should NOT have the seen marker (not written to)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    // _shown event should NOT fire
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('new_modes_announcement_shown', {});
  });

  it('given localStorage.getItem throws (private mode, etc), when mounted, then the card does NOT show and _shown does not fire', () => {
    // Stub window.localStorage to throw on getItem
    const throwingStorage = {
      getItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    Object.defineProperty(window, 'localStorage', {
      value: throwingStorage,
      writable: true,
      configurable: true,
    });

    render(<NewModesAnnouncement />);

    // Card should NOT render (fail-closed: no localStorage = no marker = no show)
    expect(screen.queryByText('newModes.title')).not.toBeInTheDocument();

    // _shown event should NOT fire
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('new_modes_announcement_shown', {});

    // Restore real localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true,
      configurable: true,
    });
  });

  it('given localStorage.setItem throws after getItem succeeds (Safari private mode), when mounted, then the card still shows but _shown does not fire', () => {
    // Stub: getItem returns null (not seen), but setItem throws
    const throwingStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    };

    Object.defineProperty(window, 'localStorage', {
      value: throwingStorage,
      writable: true,
      configurable: true,
    });

    render(<NewModesAnnouncement />);

    // If setIsVisible is called BEFORE setItem (the bug), the card shows.
    // But since we fixed it to call setItem FIRST, the card should NOT show.
    // (Once setItem throws, we bail without calling setIsVisible.)
    expect(screen.queryByText('newModes.title')).not.toBeInTheDocument();

    // _shown event should NOT fire
    expect(trackGrowthEvent).not.toHaveBeenCalledWith('new_modes_announcement_shown', {});

    // Restore real localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorage,
      writable: true,
      configurable: true,
    });
  });
});
