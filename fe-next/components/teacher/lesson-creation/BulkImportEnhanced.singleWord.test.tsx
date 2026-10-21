/**
 * A pasted/CSV list with "Rely on", "Hospice care", "Blood transfusion": the
 * board plays single words only, so those rows are refused and named, and the
 * single words still import.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useWordIntegration } from '@/hooks/useWordIntegration';
import BulkImportEnhanced from './BulkImportEnhanced';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${Object.values(p).join(',')}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/useWordIntegration', () => ({ useWordIntegration: vi.fn() }));

describe('BulkImportEnhanced — multi-word terms', () => {
  const onImport = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    (useWordIntegration as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      checkWordIntegration: vi.fn((word: string) => ({ word: word.trim().toLowerCase(), canIntegrate: true })),
    });
  });

  it('refuses multi-word rows, names them, and imports only the single words', async () => {
    render(<BulkImportEnhanced isOpen onClose={vi.fn()} onImport={onImport} language="en" />);
    fireEvent.change(screen.getByPlaceholderText('teacher.lesson.bulkImportPlaceholder'), {
      target: { value: 'Rely on - to depend on\nhospice - care for the dying\nBlood transfusion - giving blood\nwell-being' },
    });
    expect(screen.getByTestId('bulk-import-multi-word')).toHaveTextContent(
      'teacher.lesson.singleWordsOnly:"Rely on", "Blood transfusion", "well-being"',
    );
    fireEvent.click(screen.getByText(/teacher.lesson.bulkImportButton/));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(onImport.mock.calls[0][0].map((w: { word: string }) => w.word)).toEqual(['hospice']);
  });
});
