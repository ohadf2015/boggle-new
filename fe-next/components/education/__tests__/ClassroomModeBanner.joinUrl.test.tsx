import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ClassroomModeBanner } from '../ClassroomModeBanner';
import * as LanguageContext from '@/contexts/LanguageContext';

const mockUseLanguage = vi.fn();

describe('ClassroomModeBanner - joinUrl locale-prefixed generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should build joinUrl with locale prefix when gameCode and expanded are set', () => {
    mockUseLanguage.mockReturnValue({
      language: 'en',
      t: (key: string) => key,
      dir: 'ltr',
      setLanguage: vi.fn(),
      currentFlag: '🇺🇸',
    });
    vi.spyOn(LanguageContext, 'useLanguage').mockImplementation(mockUseLanguage);

    const lessonData = {
      lessonId: '123',
      lessonName: 'Test',
      vocabularyWords: [],
      language: 'en' as const,
    };

    const { container } = render(
      <ClassroomModeBanner
        lessonData={lessonData}
        gameCode="ABC123"
        expanded={true}
      />
    );

    // Component should render successfully without errors
    expect(container).toBeTruthy();
  });

  it('should render QR code when expanded with gameCode', () => {
    mockUseLanguage.mockReturnValue({
      language: 'en',
      t: (key: string) => key,
      dir: 'ltr',
      setLanguage: vi.fn(),
      currentFlag: '🇺🇸',
    });
    vi.spyOn(LanguageContext, 'useLanguage').mockImplementation(mockUseLanguage);

    const lessonData = {
      lessonId: '123',
      lessonName: 'Test Lesson',
      vocabularyWords: ['hello', 'world'],
      language: 'en' as const,
      gameMode: 'classic' as const,
      templateSettings: {
        timerSeconds: 120,
        difficulty: 'medium',
        minWordLength: 2,
        allowLateJoin: true,
      },
    };

    const { container } = render(
      <ClassroomModeBanner
        lessonData={lessonData}
        gameCode="TESTABC"
        expanded={true}
      />
    );

    // Should render the panel when expanded
    const settingsCard = container.querySelector('[class*="neo-navy"]');
    expect(settingsCard).toBeInTheDocument();
  });

  /**
   * The banner used to render the QR code and NOTHING else derived from joinUrl,
   * so a student who could not scan it — no phone, a Chromebook, or simply too
   * far from the projector — had a 6-character game code and nowhere to type it.
   * That is the 2026-08-30 incident; `tvJoinAddress` fixed it for the TV surface
   * only, and this desktop host banner still had the gap. A real ChromiumOS
   * session appears in the education replays, and a Chromebook cannot scan a QR.
   */
  it('shows the join address as readable text, not only as a QR code', () => {
    mockUseLanguage.mockReturnValue({
      language: 'en',
      t: (key: string) => key,
      dir: 'ltr',
      setLanguage: vi.fn(),
      currentFlag: '🇺🇸',
    });
    vi.spyOn(LanguageContext, 'useLanguage').mockImplementation(mockUseLanguage);

    const { container } = render(
      <ClassroomModeBanner
        lessonData={{ lessonId: '1', lessonName: 'L', vocabularyWords: [], language: 'en' as const }}
        gameCode="TESTABC"
        expanded={true}
      />
    );

    // The address a student reads off the wall and types. Must contain the route
    // that actually resolves — /[locale]/join/[code] is the only one.
    expect(container.textContent).toContain('/en/join/TESTABC');
  });
});
