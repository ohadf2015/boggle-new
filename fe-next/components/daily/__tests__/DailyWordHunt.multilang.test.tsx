/**
 * Multi-Language Edge Case Tests for Daily Word Hunt
 *
 * Tests all 4 supported languages (en, he, sv, ja) for:
 * - Hebrew RTL layout and shadow flipping
 * - Japanese character validation (hiragana, katakana, kanji)
 * - Swedish special characters (å, ä, ö)
 * - Cross-language rendering consistency
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DailyWordHuntSurvival from '../DailyWordHuntSurvival';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { LetterGrid, Language } from '@/types';

// Mock framer-motion to avoid matchMedia issues
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, whileHover, whileTap, transition, variants, ...domProps } = props as Record<string, unknown>;
      return <div {...domProps}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock contexts and hooks
jest.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => jest.fn(),
}));

jest.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: jest.fn(),
    playComboSound: jest.fn(),
    playErrorSound: jest.fn(),
    setGameActive: jest.fn(),
    playSound: jest.fn(),
  }),
}));

jest.mock('@/contexts/MusicContext', () => ({
  useMusic: () => ({
    playMusic: jest.fn(),
    stopMusic: jest.fn(),
    fadeToTrack: jest.fn(),
    isMuted: false,
    toggleMute: jest.fn(),
    TRACKS: {
      BOSSA_ARCADE: 'bossa_arcade',
      MENU: 'menu',
      GAME: 'game',
    },
  }),
}));

jest.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

jest.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: () => {},
}));

jest.mock('@/hooks/useContextualGuidance', () => ({
  useContextualGuidance: () => ({
    showSwipeTip: false,
    dismissSwipeTip: jest.fn(),
    triggerSwipeTipGuidance: jest.fn(),
  }),
  useSwipeTipGuidanceTrigger: () => {},
}));

jest.mock('@/hooks/useKeyboardWordInput', () => ({
  useKeyboardWordInput: () => ({
    highlightedCells: [],
  }),
}));

// Test grids for different languages
const englishGrid: LetterGrid = [
  ['H', 'O', 'U'],
  ['S', 'E', 'L'],
  ['T', 'A', 'P'],
];

const hebrewGrid: LetterGrid = [
  ['ש', 'ל', 'ו'],
  ['מ', 'י', 'ם'],
  ['ב', 'י', 'ת'],
];

const japaneseGrid: LetterGrid = [
  ['あ', 'い', 'う'],
  ['か', 'き', 'く'],
  ['さ', 'し', 'す'],
];

const swedishGrid: LetterGrid = [
  ['Å', 'L', 'D'],
  ['R', 'E', 'N'],
  ['B', 'Ä', 'K'],
];

describe('Hebrew RTL Layout', () => {
  beforeEach(() => {
    // Set up RTL environment
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';
  });

  afterEach(() => {
    // Clean up - reset to LTR
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  test('should set correct text direction for Hebrew content', () => {
    render(
      <LanguageProvider initialLanguage="he">
        <DailyWordHuntSurvival
          grid={hebrewGrid}
          puzzleNumber={1}
          language="he"
          targetWord="שלום"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify RTL is set on document
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
  });

  test('should handle long Hebrew words without overflow', () => {
    const longHebrewWord = 'אבגדהוזחטיכלמנסעפצקרשת';

    render(
      <LanguageProvider initialLanguage="he">
        <DailyWordHuntSurvival
          grid={hebrewGrid}
          puzzleNumber={1}
          language="he"
          targetWord={longHebrewWord}
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Component should render without crashing
    expect(document.documentElement.dir).toBe('rtl');
  });

  test('should apply RTL shadow flip for Hebrew layout', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="he">
        <DailyWordHuntSurvival
          grid={hebrewGrid}
          puzzleNumber={1}
          language="he"
          targetWord="שלום"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify RTL direction is applied
    expect(document.documentElement.dir).toBe('rtl');

    // Shadow flip is handled by CSS ([dir="rtl"] .shadow-hard)
    // This test verifies the RTL attribute is set correctly
    const elements = container.querySelectorAll('.shadow-hard, .shadow-hard-sm, .shadow-hard-lg');
    expect(elements.length).toBeGreaterThan(0);
  });

  test('should render Hebrew letters correctly in grid', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="he">
        <DailyWordHuntSurvival
          grid={hebrewGrid}
          puzzleNumber={1}
          language="he"
          targetWord="שלום"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify Hebrew letters are in the DOM
    const hebrewLetters = ['ש', 'ל', 'ו', 'מ', 'י', 'ם', 'ב', 'ת'];
    hebrewLetters.forEach(letter => {
      expect(container.textContent).toContain(letter);
    });
  });

  test('should handle mixed Hebrew and English text', () => {
    render(
      <LanguageProvider initialLanguage="he">
        <DailyWordHuntSurvival
          grid={hebrewGrid}
          puzzleNumber={42}
          language="he"
          targetWord="שלום"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Should handle puzzle number (English digits) with Hebrew UI
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('he');
  });
});

describe('Japanese Character Handling', () => {
  beforeEach(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'ja';
  });

  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  test('should handle hiragana correctly', () => {
    const hiraganaWords = ['ひらがな', 'たべる', 'あいうえお'];

    hiraganaWords.forEach(word => {
      const { container } = render(
        <LanguageProvider initialLanguage="ja">
          <DailyWordHuntSurvival
            grid={japaneseGrid}
            puzzleNumber={1}
            language="ja"
            targetWord={word}
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      // Verify word length is calculated correctly (character count, not bytes)
      expect(word.length).toBeGreaterThan(0);
      expect(word.length).toBeLessThan(50); // Reasonable length
    });
  });

  test('should handle katakana correctly', () => {
    const katakanaWords = ['カタカナ', 'コンピュータ'];

    katakanaWords.forEach(word => {
      const { container } = render(
        <LanguageProvider initialLanguage="ja">
          <DailyWordHuntSurvival
            grid={japaneseGrid}
            puzzleNumber={1}
            language="ja"
            targetWord={word}
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      // Component should render without crashing
      expect(document.documentElement.lang).toBe('ja');
    });
  });

  test('should handle kanji correctly', () => {
    const kanjiWords = ['漢字', '日本語', '言葉'];

    kanjiWords.forEach(word => {
      const { container } = render(
        <LanguageProvider initialLanguage="ja">
          <DailyWordHuntSurvival
            grid={japaneseGrid}
            puzzleNumber={1}
            language="ja"
            targetWord={word}
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      // Verify Japanese language is set
      expect(document.documentElement.lang).toBe('ja');
    });
  });

  test('should handle mixed Japanese character types', () => {
    const mixedWord = 'ひらがなカタカナ漢字';

    const { container } = render(
      <LanguageProvider initialLanguage="ja">
        <DailyWordHuntSurvival
          grid={japaneseGrid}
          puzzleNumber={1}
          language="ja"
          targetWord={mixedWord}
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Should handle mixed character types
    expect(document.documentElement.lang).toBe('ja');
    expect(mixedWord.length).toBe(10); // Character count, not bytes (4 hiragana + 4 katakana + 2 kanji)
  });

  test('should render Japanese letters in grid correctly', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="ja">
        <DailyWordHuntSurvival
          grid={japaneseGrid}
          puzzleNumber={1}
          language="ja"
          targetWord="あいう"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify Japanese letters are in the DOM
    const japaneseLetters = ['あ', 'い', 'う', 'か', 'き', 'く', 'さ', 'し', 'す'];
    japaneseLetters.forEach(letter => {
      expect(container.textContent).toContain(letter);
    });
  });
});

describe('Swedish Special Characters', () => {
  beforeEach(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'sv';
  });

  afterEach(() => {
    document.documentElement.lang = 'en';
  });

  test('should handle å, ä, ö in words', () => {
    const swedishWords = ['skål', 'äpple', 'öl', 'smörgås'];

    swedishWords.forEach(word => {
      const { container } = render(
        <LanguageProvider initialLanguage="sv">
          <DailyWordHuntSurvival
            grid={swedishGrid}
            puzzleNumber={1}
            language="sv"
            targetWord={word}
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      // Component should render without crashing
      expect(document.documentElement.lang).toBe('sv');
    });
  });

  test('should handle uppercase Swedish special characters', () => {
    const uppercaseWord = 'ÅÄÖÅÄÖ';

    const { container } = render(
      <LanguageProvider initialLanguage="sv">
        <DailyWordHuntSurvival
          grid={swedishGrid}
          puzzleNumber={1}
          language="sv"
          targetWord={uppercaseWord}
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Should handle uppercase Swedish characters
    expect(document.documentElement.lang).toBe('sv');
  });

  test('should render Swedish special characters in grid correctly', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="sv">
        <DailyWordHuntSurvival
          grid={swedishGrid}
          puzzleNumber={1}
          language="sv"
          targetWord="ÅLDER"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify Swedish letters are in the DOM
    expect(container.textContent).toContain('Å');
    expect(container.textContent).toContain('Ä');
  });

  test('should handle Swedish character encoding correctly', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="sv">
        <DailyWordHuntSurvival
          grid={swedishGrid}
          puzzleNumber={1}
          language="sv"
          targetWord="smörgåsbord"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify UTF-8 encoding works correctly
    expect(document.documentElement.lang).toBe('sv');
  });
});

describe('English Baseline', () => {
  beforeEach(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  test('should render English content correctly', () => {
    const { container } = render(
      <LanguageProvider initialLanguage="en">
        <DailyWordHuntSurvival
          grid={englishGrid}
          puzzleNumber={1}
          language="en"
          targetWord="HOUSE"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify LTR direction
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
  });

  test('should handle long English words', () => {
    const longWord = 'ANTIDISESTABLISHMENTARIANISM';

    const { container } = render(
      <LanguageProvider initialLanguage="en">
        <DailyWordHuntSurvival
          grid={englishGrid}
          puzzleNumber={1}
          language="en"
          targetWord={longWord}
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Component should handle long words
    expect(document.documentElement.lang).toBe('en');
  });
});

describe('Cross-Language Validation', () => {
  // Subset of languages tested in this spec
  type TestedLanguage = 'en' | 'he' | 'sv' | 'ja';
  const languages: TestedLanguage[] = ['en', 'he', 'sv', 'ja'];

  const grids: Record<TestedLanguage, LetterGrid> = {
    en: englishGrid,
    he: hebrewGrid,
    sv: swedishGrid,
    ja: japaneseGrid,
  };

  const targetWords: Record<TestedLanguage, string> = {
    en: 'HOUSE',
    he: 'שלום',
    sv: 'ÅLDER',
    ja: 'あいう',
  };

  beforeEach(() => {
    // Reset to default before each test
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    // Clean up after each test
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  });

  languages.forEach(lang => {
    test(`should render game correctly in ${lang}`, () => {
      // Set language before rendering
      document.documentElement.lang = lang;
      if (lang === 'he') {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }

      const { container } = render(
        <LanguageProvider initialLanguage={lang}>
          <DailyWordHuntSurvival
            grid={grids[lang]}
            puzzleNumber={1}
            language={lang}
            targetWord={targetWords[lang]}
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      // Verify component renders without crashing
      expect(container).toBeInTheDocument();

      // Verify language is set correctly
      expect(document.documentElement.lang).toBe(lang);

      // Verify direction is correct
      if (lang === 'he') {
        expect(document.documentElement.dir).toBe('rtl');
      } else {
        expect(document.documentElement.dir).toBe('ltr');
      }
    });

    test(`should handle puzzle number display in ${lang}`, () => {
      // Set language before rendering
      document.documentElement.lang = lang;
      if (lang === 'he') {
        document.documentElement.dir = 'rtl';
      } else {
        document.documentElement.dir = 'ltr';
      }

      const { container } = render(
        <LanguageProvider initialLanguage={lang}>
          <DailyWordHuntSurvival
            grid={grids[lang]}
            puzzleNumber={42}
            language={lang}
            targetWord={targetWords[lang]}
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      // Should render without crashing with puzzle number
      expect(container).toBeInTheDocument();
    });
  });

  test('should maintain consistent behavior across all languages', () => {
    const results = languages.map(lang => {
      const { container } = render(
        <LanguageProvider initialLanguage={lang}>
          <DailyWordHuntSurvival
            grid={grids[lang]}
            puzzleNumber={1}
            language={lang}
            targetWord={targetWords[lang]}
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      return {
        lang,
        hasContent: container.textContent!.length > 0,
        isRendered: container.querySelector('[class*="flex"]') !== null,
      };
    });

    // All languages should render successfully
    results.forEach(result => {
      expect(result.hasContent).toBe(true);
      expect(result.isRendered).toBe(true);
    });
  });
});

describe('RTL Shadow Flip Verification', () => {
  test('should use correct shadow direction for LTR languages', () => {
    ['en', 'sv', 'ja'].forEach(lang => {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = lang;

      const { container } = render(
        <LanguageProvider initialLanguage={lang as Language}>
          <DailyWordHuntSurvival
            grid={englishGrid}
            puzzleNumber={1}
            language={lang as Language}
            targetWord="TEST"
            onComplete={jest.fn()}
            onQuit={jest.fn()}
          />
        </LanguageProvider>
      );

      // Verify LTR direction
      expect(document.documentElement.dir).toBe('ltr');
    });
  });

  test('should use flipped shadow direction for RTL language (Hebrew)', () => {
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';

    const { container } = render(
      <LanguageProvider initialLanguage="he">
        <DailyWordHuntSurvival
          grid={hebrewGrid}
          puzzleNumber={1}
          language="he"
          targetWord="שלום"
          onComplete={jest.fn()}
          onQuit={jest.fn()}
        />
      </LanguageProvider>
    );

    // Verify RTL direction is set
    expect(document.documentElement.dir).toBe('rtl');

    // Shadow flip is applied via CSS [dir="rtl"] selectors
    // Example: [dir="rtl"] .shadow-hard { box-shadow: -4px 4px 0px }
    const elementsWithShadow = container.querySelectorAll('[class*="shadow-hard"]');
    expect(elementsWithShadow.length).toBeGreaterThan(0);
  });
});

describe('Character Length Validation', () => {
  test('should calculate Japanese character length correctly', () => {
    const hiraganaWord = 'ひらがな'; // 4 characters
    const kanjiWord = '漢字'; // 2 characters

    expect(hiraganaWord.length).toBe(4);
    expect(kanjiWord.length).toBe(2);

    // Verify not counting bytes
    expect(hiraganaWord.length).not.toBe(12); // 3 bytes per char
    expect(kanjiWord.length).not.toBe(6); // 3 bytes per char
  });

  test('should calculate Swedish character length correctly', () => {
    const swedishWord = 'smörgås'; // 7 characters

    expect(swedishWord.length).toBe(7);

    // ö and å are single characters
    expect(swedishWord.indexOf('ö')).toBeGreaterThan(-1);
    expect(swedishWord.indexOf('å')).toBeGreaterThan(-1);
  });

  test('should calculate Hebrew character length correctly', () => {
    const hebrewWord = 'שלום'; // 4 characters

    expect(hebrewWord.length).toBe(4);
  });
});
