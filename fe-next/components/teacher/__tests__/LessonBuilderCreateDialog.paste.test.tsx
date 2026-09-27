/**
 * Pasting a list is the primary way a lesson gets made.
 *
 * The goal for this surface is plug and play: a teacher pastes words and is
 * playing, on one screen. What was there instead put a template picker first —
 * expanded by default, above the name field — and hid pasting behind a "Bulk
 * Import" button that opened a second modal on top of this one.
 *
 * Now the paste box is in the dialog, it parses as you type, and the parsed
 * words are visible before you commit them.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('../lesson-creation', () => ({
  TemplateLessonSelector: () => <div data-testid="template-selector" />,
}));
vi.mock('../WordListEditor', () => ({
  __esModule: true,
  default: ({ words }: { words: { word: string }[] }) => (
    <div data-testid="word-list-editor">{words.map((w) => w.word).join(',')}</div>
  ),
}));

import LessonBuilderCreateDialog from '../LessonBuilderCreateDialog';

const setup = (overrides: Record<string, unknown> = {}) => {
  const onWordsChange = vi.fn();
  const props = {
    isOpen: true,
    onOpenChange: vi.fn(),
    formData: { name: '', description: '', language: 'en', classroomId: '', isPublic: false },
    onFormDataChange: vi.fn(),
    words: [],
    onWordsChange,
    classrooms: [],
    isSaving: false,
    showTemplateSelector: false,
    onToggleTemplateSelector: vi.fn(),
    onTemplateSelect: vi.fn(),
    onBulkImportOpen: vi.fn(),
    onCreate: vi.fn(),
    t: (k: string, p?: Record<string, unknown>) =>
      p && 'count' in p ? `${k}:${p.count}` : k,
    ...overrides,
  };
  render(<LessonBuilderCreateDialog {...(props as any)} />);
  return { onWordsChange };
};

describe('LessonBuilderCreateDialog — paste is the primary path', () => {
  it('offers a paste box in the dialog', () => {
    setup();
    expect(screen.getByTestId('lesson-paste-box')).toBeInTheDocument();
  });

  it('previews the parsed words as they are pasted, before committing them', () => {
    setup();
    fireEvent.change(screen.getByTestId('lesson-paste-box'), {
      target: { value: 'osmosis\nnucleus\nenzyme' },
    });

    const preview = screen.getByTestId('lesson-paste-preview');
    expect(preview).toHaveTextContent('osmosis');
    expect(preview).toHaveTextContent('nucleus');
    expect(preview).toHaveTextContent('enzyme');
    expect(preview).toHaveTextContent('3');
  });

  it('parses a comma-separated paste the same way', () => {
    setup();
    fireEvent.change(screen.getByTestId('lesson-paste-box'), {
      target: { value: 'osmosis, nucleus, enzyme' },
    });
    expect(screen.getByTestId('lesson-paste-preview')).toHaveTextContent('3');
  });

  it('adds the parsed words to the lesson', () => {
    const { onWordsChange } = setup();
    fireEvent.change(screen.getByTestId('lesson-paste-box'), {
      target: { value: 'osmosis\nnucleus' },
    });
    fireEvent.click(screen.getByTestId('lesson-paste-add'));

    expect(onWordsChange).toHaveBeenCalledWith([
      { word: 'osmosis', canIntegrate: true },
      { word: 'nucleus', canIntegrate: true },
    ]);
  });

  it('shows no preview and no add button for an empty box', () => {
    setup();
    expect(screen.queryByTestId('lesson-paste-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lesson-paste-add')).not.toBeInTheDocument();
  });
});
