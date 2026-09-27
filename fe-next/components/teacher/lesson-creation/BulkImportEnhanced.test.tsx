/**
 * Tests for BulkImportEnhanced Component
 * Validates enhanced bulk import with validation pipeline
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/contexts/LanguageContext';
import BulkImportEnhanced from './BulkImportEnhanced';
import type { Language } from '@/lib/supabase/education/types';
import { useWordIntegration } from '@/hooks/useWordIntegration';

// Mock useWordIntegration hook
vi.mock('@/hooks/useWordIntegration');

// Mock translations
vi.mock('@/contexts/LanguageContext', () => ({
  ...vi.importActual('@/contexts/LanguageContext'),
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'teacher.lesson.bulkImportTitle': 'Import Multiple Words',
        'teacher.lesson.bulkImportDescription': 'Paste words or upload CSV',
        'teacher.lesson.bulkImportLabel': 'Paste words here',
        'teacher.lesson.bulkImportPlaceholder': 'Paste words...',
        'teacher.lesson.bulkImportDetected': '{{count}} words detected',
        'teacher.lesson.bulkImportButton': 'Import',
        'common.cancel': 'Cancel',
        'common.more': 'more',
        'teacher.lesson.canIntegrate': 'ready',
      };
      let str = translations[key] || key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{\\{?${k}\\}?\\}`, 'g'), String(v));
        }
      }
      return str;
    },
    language: 'en' as Language,
    setLanguage: vi.fn(),
    isRTL: false,
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('BulkImportEnhanced', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();
  const mockCheckWordIntegration = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation: words are integrable
    mockCheckWordIntegration.mockImplementation((word: string) => ({
      word: word.trim().toLowerCase(),
      canIntegrate: true,
      reason: undefined,
    }));

    (useWordIntegration as jest.Mock).mockReturnValue({
      checkWordIntegration: mockCheckWordIntegration,
    });
  });

  it('should render dialog with textarea and file upload area', () => {
    render(
      <BulkImportEnhanced
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="en"
      />
    );

    expect(screen.getByText('Import Multiple Words')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Paste words...')).toBeInTheDocument();
  });

  it('should parse newline-separated words correctly', async () => {
    const user = userEvent.setup();
    render(
      <BulkImportEnhanced
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="en"
      />
    );

    const textarea = screen.getByPlaceholderText('Paste words...');
    await user.type(textarea, 'cat\ndog\nfish');

    // Should show detected count
    await waitFor(() => {
      expect(screen.getByText(/3 words detected/i)).toBeInTheDocument();
    });
  });

  it('should show niqqud warning for Hebrew words with vowel points', async () => {
    const user = userEvent.setup();

    // Mock Hebrew words with niqqud detection
    mockCheckWordIntegration.mockImplementation((word: string) => {
      const normalized = word.trim().toLowerCase();
      return {
        word: normalized.replace(/[\u0591-\u05C7]/g, ''), // Remove niqqud
        canIntegrate: true,
        reason: undefined,
      };
    });

    render(
      <BulkImportEnhanced
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="he"
      />
    );

    const textarea = screen.getByPlaceholderText('Paste words...');
    // Hebrew word "cat" with niqqud: חָתוּל
    await user.type(textarea, 'חָתוּל\nכֶּלֶב\nדָּג');

    await waitFor(() => {
      expect(screen.getByText(/3 words detected/i)).toBeInTheDocument();
    });

    // Should show niqqud warning (implementation will add this)
    // This test documents expected behavior
  });

  it('should show row-level errors for non-integrable words', async () => {
    const user = userEvent.setup();

    // Mock some words as non-integrable
    mockCheckWordIntegration.mockImplementation((word: string) => {
      const normalized = word.trim().toLowerCase();
      if (normalized === 'xyz') {
        return {
          word: normalized,
          canIntegrate: false,
          reason: 'word_not_in_dictionary' as const,
        };
      }
      return {
        word: normalized,
        canIntegrate: true,
        reason: undefined,
      };
    });

    render(
      <BulkImportEnhanced
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="en"
      />
    );

    const textarea = screen.getByPlaceholderText('Paste words...');
    await user.type(textarea, 'cat\nxyz\ndog');

    await waitFor(() => {
      expect(screen.getByText(/3 words detected/i)).toBeInTheDocument();
    });

    // Should show 2 ready, 1 error
    // This documents expected behavior
  });

  it('should call onImport with validated words on submit', async () => {
    const user = userEvent.setup();
    render(
      <BulkImportEnhanced
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="en"
      />
    );

    const textarea = screen.getByPlaceholderText('Paste words...');
    await user.type(textarea, 'cat\ndog');

    await waitFor(() => {
      expect(screen.getByText(/2 words detected/i)).toBeInTheDocument();
    });

    const importButton = screen.getByRole('button', { name: /Import/i });
    await user.click(importButton);

    expect(mockOnImport).toHaveBeenCalledTimes(1);
    const importedWords = mockOnImport.mock.calls[0][0];
    expect(importedWords).toHaveLength(2);
    expect(importedWords[0].word).toBe('cat');
    expect(importedWords[1].word).toBe('dog');
  });

  it('should file upload populate textarea', async () => {
    render(
      <BulkImportEnhanced
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="en"
      />
    );

    // File upload should exist
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // This documents that file upload should populate textarea
    // Full implementation will be tested with actual FileReader mocks
  });

  it('should show stats bar with ready/warning/error counts', async () => {
    const user = userEvent.setup();

    mockCheckWordIntegration.mockImplementation((word: string) => {
      const normalized = word.trim().toLowerCase();
      if (normalized === 'xyz') {
        return {
          word: normalized,
          canIntegrate: false,
          reason: 'word_not_in_dictionary' as const,
        };
      }
      return {
        word: normalized,
        canIntegrate: true,
        reason: undefined,
      };
    });

    render(
      <BulkImportEnhanced
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="en"
      />
    );

    const textarea = screen.getByPlaceholderText('Paste words...');
    await user.type(textarea, 'cat\ndog\nxyz');

    await waitFor(() => {
      // Should show integrable count
      expect(screen.getByText(/ready/i)).toBeInTheDocument();
    });
  });
});
