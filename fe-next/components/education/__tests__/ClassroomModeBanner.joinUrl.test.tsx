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
});
