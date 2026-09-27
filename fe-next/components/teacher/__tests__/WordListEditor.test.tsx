/**
 * WordListEditor Component Tests
 *
 * Tests for the reusable word + definition editor
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordListEditor from '../WordListEditor';
import { LanguageProvider } from '@/contexts/LanguageContext';
import type { VocabularyWord } from '@/lib/supabase/education';

// Mock word integration hook
vi.mock('@/hooks/useWordIntegration', () => ({
  useWordIntegration: () => ({
    checkWordIntegration: vi.fn((word: string) => ({
      word,
      canIntegrate: word.length >= 3,
    })),
  }),
}));

const mockOnWordsChange = vi.fn();

const sampleWords: VocabularyWord[] = [
  { word: 'apple', definition: 'A round fruit', canIntegrate: true },
  { word: 'banana', definition: '', canIntegrate: true },
  { word: 'kiwi', definition: 'A fuzzy fruit', canIntegrate: true },
];

const renderEditor = (props: Partial<React.ComponentProps<typeof WordListEditor>> = {}) => {
  return render(
    <LanguageProvider>
      <WordListEditor
        words={sampleWords}
        onWordsChange={mockOnWordsChange}
        language="en"
        {...props}
      />
    </LanguageProvider>
  );
};

describe('WordListEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all words', () => {
      renderEditor();
      expect(screen.getByText('apple')).toBeInTheDocument();
      expect(screen.getByText('banana')).toBeInTheDocument();
      expect(screen.getByText('kiwi')).toBeInTheDocument();
    });

    it('should show integration status icons', () => {
      renderEditor();
      // 3 words all canIntegrate = true → 3 integration icons
      const integrationLabels = screen.getAllByText(/can embed/i);
      expect(integrationLabels).toHaveLength(3);
    });

    it('should render definition inputs for each word', () => {
      renderEditor();
      const definitionInputs = screen.getAllByPlaceholderText(/add definition/i);
      expect(definitionInputs).toHaveLength(3);
    });

    it('should display existing definitions in inputs', () => {
      renderEditor();
      const definitionInputs = screen.getAllByPlaceholderText(/add definition/i);
      expect(definitionInputs[0]).toHaveValue('A round fruit');
      expect(definitionInputs[1]).toHaveValue('');
      expect(definitionInputs[2]).toHaveValue('A fuzzy fruit');
    });

    it('should show empty state when no words', () => {
      renderEditor({ words: [] });
      expect(screen.getByText(/no words/i)).toBeInTheDocument();
    });
  });

  describe('add word input', () => {
    it('should show add input when showAddInput is true', () => {
      renderEditor({ showAddInput: true });
      expect(screen.getByPlaceholderText(/enter a word/i)).toBeInTheDocument();
    });

    it('should not show add input when showAddInput is false', () => {
      renderEditor({ showAddInput: false });
      expect(screen.queryByPlaceholderText(/enter a word/i)).not.toBeInTheDocument();
    });

    it('should add word on Enter key', async () => {
      const user = userEvent.setup();
      renderEditor({ showAddInput: true });
      const input = screen.getByPlaceholderText(/enter a word/i);

      await user.type(input, 'grape{Enter}');

      expect(mockOnWordsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          ...sampleWords,
          expect.objectContaining({ word: 'grape', definition: '' }),
        ])
      );
    });

    it('should add word on plus button click', async () => {
      const user = userEvent.setup();
      renderEditor({ showAddInput: true });
      const input = screen.getByPlaceholderText(/enter a word/i);

      await user.type(input, 'grape');
      const addButton = screen.getByRole('button', { name: /add/i });
      await user.click(addButton);

      expect(mockOnWordsChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          ...sampleWords,
          expect.objectContaining({ word: 'grape' }),
        ])
      );
    });

    it('should not add empty word', async () => {
      const user = userEvent.setup();
      renderEditor({ showAddInput: true });
      const input = screen.getByPlaceholderText(/enter a word/i);

      await user.type(input, '   {Enter}');

      expect(mockOnWordsChange).not.toHaveBeenCalled();
    });
  });

  describe('definition editing', () => {
    it('should call onWordsChange when definition is typed', async () => {
      const user = userEvent.setup();
      renderEditor();
      const definitionInputs = screen.getAllByPlaceholderText(/add definition/i);

      // Type first character into banana's definition (index 1, currently empty)
      await user.type(definitionInputs[1], 'A');

      // Controlled component: onWordsChange is called with the updated words array
      expect(mockOnWordsChange).toHaveBeenCalledWith([
        sampleWords[0],
        { ...sampleWords[1], definition: 'A' },
        sampleWords[2],
      ]);
    });
  });

  describe('word removal', () => {
    it('should remove word when remove button clicked', async () => {
      const user = userEvent.setup();
      renderEditor();
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });

      await user.click(removeButtons[1]); // Remove 'banana'

      expect(mockOnWordsChange).toHaveBeenCalledWith([
        sampleWords[0],
        sampleWords[2],
      ]);
    });
  });

  describe('bulk import button', () => {
    it('should show bulk import button when showBulkImport is true', () => {
      const mockOpenBulkImport = vi.fn();
      renderEditor({ showBulkImport: true, onBulkImportOpen: mockOpenBulkImport });
      expect(screen.getByText(/bulk import/i)).toBeInTheDocument();
    });

    it('should not show bulk import button when showBulkImport is false', () => {
      renderEditor({ showBulkImport: false });
      expect(screen.queryByText(/bulk import/i)).not.toBeInTheDocument();
    });

    it('should call onBulkImportOpen when bulk import clicked', async () => {
      const user = userEvent.setup();
      const mockOpenBulkImport = vi.fn();
      renderEditor({ showBulkImport: true, onBulkImportOpen: mockOpenBulkImport });

      await user.click(screen.getByText(/bulk import/i));
      expect(mockOpenBulkImport).toHaveBeenCalled();
    });
  });
});
