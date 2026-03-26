/**
 * BulkWordImporter Component Tests
 *
 * Tests for the bulk word import dialog
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BulkWordImporter from '../BulkWordImporter';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock word integration hook
vi.mock('@/hooks/useWordIntegration', () => ({
  useWordIntegration: () => ({
    checkWordIntegration: vi.fn((word: string) => ({
      word,
      canIntegrate: word.length >= 3,
    })),
  }),
}));

const mockOnImport = vi.fn();
const mockOnClose = vi.fn();

const renderComponent = (props = {}) => {
  return render(
    <LanguageProvider>
      <BulkWordImporter
        isOpen={true}
        onClose={mockOnClose}
        onImport={mockOnImport}
        language="en"
        {...props}
      />
    </LanguageProvider>
  );
};

describe('BulkWordImporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render when open', () => {
      renderComponent();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(
        <LanguageProvider>
          <BulkWordImporter
            isOpen={false}
            onClose={mockOnClose}
            onImport={mockOnImport}
            language="en"
          />
        </LanguageProvider>
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should have a textarea for pasting words', () => {
      renderComponent();
      expect(screen.getByPlaceholderText(/paste words/i)).toBeInTheDocument();
    });
  });

  describe('word detection', () => {
    it('should detect newline-separated words', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple{enter}banana{enter}cherry');

      expect(screen.getByText(/3 words detected/i)).toBeInTheDocument();
    });

    it('should detect comma-separated words', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple, banana, cherry');

      expect(screen.getByText(/3 words detected/i)).toBeInTheDocument();
    });

    it('should filter out empty lines', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple{enter}{enter}banana{enter}{enter}{enter}cherry');

      expect(screen.getByText(/3 words detected/i)).toBeInTheDocument();
    });

    it('should trim whitespace from words', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, '  apple  {enter}  banana  ');

      expect(screen.getByText(/2 words detected/i)).toBeInTheDocument();
    });
  });

  describe('import functionality', () => {
    it('should call onImport with parsed words when import clicked', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple{enter}banana');

      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ word: 'apple' }),
          expect.objectContaining({ word: 'banana' }),
        ])
      );
    });

    it('should close dialog after successful import', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple');

      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable import button when no words detected', () => {
      renderComponent();
      const importButton = screen.getByRole('button', { name: /import/i });
      expect(importButton).toBeDisabled();
    });
  });

  describe('cancel functionality', () => {
    it('should call onClose when cancel clicked', async () => {
      renderComponent();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await userEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('word validation preview', () => {
    it('should show validation status for detected words', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple{enter}ab');

      // Wait for validation to appear
      await waitFor(() => {
        // apple (3+ chars) should be integrable
        expect(screen.getByText('apple')).toBeInTheDocument();
        // ab (2 chars) should not be integrable
        expect(screen.getByText('ab')).toBeInTheDocument();
      });
    });
  });

  describe('definition parsing', () => {
    it('should parse "word - definition" format', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple - A round fruit{enter}banana - A yellow fruit');

      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ word: 'apple', definition: 'A round fruit' }),
          expect.objectContaining({ word: 'banana', definition: 'A yellow fruit' }),
        ])
      );
    });

    it('should parse "word: definition" format', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple : A round fruit{enter}banana : A yellow fruit');

      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ word: 'apple', definition: 'A round fruit' }),
          expect.objectContaining({ word: 'banana', definition: 'A yellow fruit' }),
        ])
      );
    });

    it('should not split hyphenated words without spaces around delimiter', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'self-esteem{enter}well-known');

      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ word: 'self-esteem', definition: '' }),
          expect.objectContaining({ word: 'well-known', definition: '' }),
        ])
      );
    });

    it('should handle mixed lines (some with definitions, some without)', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      // 2 out of 3 lines have definitions (>50%) → definition mode
      await userEvent.type(textarea, 'apple - A round fruit{enter}banana - A yellow fruit{enter}cherry');

      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ word: 'apple', definition: 'A round fruit' }),
          expect.objectContaining({ word: 'banana', definition: 'A yellow fruit' }),
          expect.objectContaining({ word: 'cherry', definition: '' }),
        ])
      );
    });

    it('should show definitions in preview chips when in definition mode', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple - A round fruit{enter}banana - A yellow fruit');

      // Should show the word in preview chip
      expect(screen.getByText('apple')).toBeInTheDocument();
      // Definition appears in both textarea and preview — check preview chip specifically
      expect(screen.getByText(/— A round fruit/)).toBeInTheDocument();
    });

    it('should maintain backward compatibility with word-only input', async () => {
      renderComponent();
      const textarea = screen.getByPlaceholderText(/paste words/i);

      await userEvent.type(textarea, 'apple{enter}banana{enter}cherry');

      const importButton = screen.getByRole('button', { name: /import/i });
      await userEvent.click(importButton);

      expect(mockOnImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ word: 'apple', definition: '' }),
          expect.objectContaining({ word: 'banana', definition: '' }),
          expect.objectContaining({ word: 'cherry', definition: '' }),
        ])
      );
    });
  });
});
