import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const updateLesson = vi.fn(async () => ({ success: true }));
const lessons = [{ id: 'L1', name: 'Physics', language: 'en', words: [{ word: 'photon' }], is_public: false }];

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/hooks/useVocabularyLesson', () => ({ useLessons: () => ({ lessons, isLoading: false, updateLesson }) }));
vi.mock('@/hooks/useClassroom', () => ({ useClassrooms: () => ({ classrooms: [] }) }));
vi.mock('@/lib/education/libraryClient', () => ({ publishList: vi.fn(async () => ({ ok: true })) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../ListEditorSheet', () => ({
  default: ({ open, initial, onSave }: { open: boolean; initial: { name: string }; onSave: (d: unknown) => void }) =>
    open ? (
      <div data-testid="editor" data-name={initial.name}>
        <button type="button" onClick={() => onSave({ ...initial, name: 'Physics 2' })}>save</button>
      </div>
    ) : null,
}));

import ListNameButton from '../ListNameButton';

describe('ListNameButton', () => {
  beforeEach(() => updateLesson.mockClear());

  it('Given a list name, When it is tapped, Then that list opens in the editor', () => {
    render(<ListNameButton lessonId="L1" name="Physics" />);
    expect(screen.queryByTestId('editor')).toBeNull();
    fireEvent.click(screen.getByTestId('open-list-L1'));
    expect(screen.getByTestId('editor')).toHaveAttribute('data-name', 'Physics');
  });

  it('When the teacher saves, Then the list is updated', async () => {
    render(<ListNameButton lessonId="L1" name="Physics" />);
    fireEvent.click(screen.getByTestId('open-list-L1'));
    fireEvent.click(screen.getByText('save'));
    await waitFor(() => expect(updateLesson).toHaveBeenCalledWith('L1', expect.objectContaining({ name: 'Physics 2' })));
  });

  it('Given no list id, Then the name is plain text', () => {
    render(<ListNameButton lessonId={null} name="Physics" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Physics')).toBeInTheDocument();
  });
});
