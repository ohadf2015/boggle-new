import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/components/teacher/WordListEditor', () => ({
  default: ({ words }: { words: { word: string }[] }) => <div data-testid="word-details-editor">{words.length}</div>,
}));

import ListEditorSheet, { emptyListDraft } from '../ListEditorSheet';

function setup(overrides: Partial<Parameters<typeof ListEditorSheet>[0]> = {}) {
  const onSave = vi.fn(async () => true);
  render(
    <ListEditorSheet
      open
      onOpenChange={() => {}}
      initial={emptyListDraft('en')}
      classrooms={[{ id: 'c1', name: 'Period 3' }]}
      onSave={onSave}
      {...overrides}
    />,
  );
  return { onSave };
}

const box = () => screen.getByTestId('list-paste-box') as HTMLTextAreaElement;
const chips = () => within(screen.getByTestId('list-word-chips')).queryAllByTestId('list-word-chip');

describe('ListEditorSheet', () => {
  beforeEach(() => vi.clearAllMocks());

  it('turns a pasted list into chips instantly, with no separate add step', () => {
    setup();
    fireEvent.paste(box(), { clipboardData: { getData: () => 'osmosis\nnucleus\nenzyme' } });
    expect(chips().map((c) => c.textContent)).toEqual([
      expect.stringContaining('osmosis'),
      expect.stringContaining('nucleus'),
      expect.stringContaining('enzyme'),
    ]);
    expect(box().value).toBe('');
    expect(screen.queryByTestId('lesson-paste-add')).not.toBeInTheDocument();
  });

  it('commits a word as soon as a separator is typed and keeps the unfinished fragment', () => {
    setup();
    fireEvent.change(box(), { target: { value: 'apple, banana, ki' } });
    expect(chips()).toHaveLength(2);
    expect(box().value).toBe('ki');
  });

  it('saves the half-typed word too — Save never silently drops what is in the box', async () => {
    const { onSave } = setup();
    fireEvent.change(screen.getByTestId('list-title'), { target: { value: 'Fruits' } });
    fireEvent.change(box(), { target: { value: 'apple, kiwi' } });
    fireEvent.click(screen.getByTestId('list-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const draft = onSave.mock.calls[0][0] as { name: string; words: { word: string }[] };
    expect(draft.name).toBe('Fruits');
    expect(draft.words.map((w) => w.word)).toEqual(['apple', 'kiwi']);
  });

  it('explains inline why Save cannot run instead of failing silently', () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByTestId('list-save'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('list-save-hint')).toHaveTextContent('eduLibrary.editor.needTitle');
  });

  it('skips duplicates and says so', () => {
    setup();
    fireEvent.paste(box(), { clipboardData: { getData: () => 'apple, Apple, pear' } });
    expect(chips()).toHaveLength(2);
    expect(screen.getByTestId('list-paste-feedback')).toHaveTextContent('eduLibrary.editor.skippedDuplicates');
  });

  it('flags a word in the wrong script on its chip', () => {
    setup();
    fireEvent.paste(box(), { clipboardData: { getData: () => 'apple, שלום' } });
    const flagged = chips()[1];
    expect(flagged).toHaveAttribute('data-issue', 'wrongScript');
  });

  it('removes a chip', () => {
    setup();
    fireEvent.paste(box(), { clipboardData: { getData: () => 'apple, pear' } });
    fireEvent.click(within(chips()[0]).getByRole('button', { name: /eduLibrary.editor.removeWord/ }));
    expect(chips()).toHaveLength(1);
  });

  it('edits a definition from the chip', () => {
    setup();
    fireEvent.paste(box(), { clipboardData: { getData: () => 'apple' } });
    fireEvent.click(within(chips()[0]).getByTestId('list-word-chip-open'));
    fireEvent.change(screen.getByTestId('list-word-definition'), { target: { value: 'a red fruit' } });
    expect(chips()[0]).toHaveTextContent('a red fruit');
  });

  it('reads word - definition lines', () => {
    setup();
    fireEvent.paste(box(), { clipboardData: { getData: () => 'osmosis - water moving, slowly' } });
    expect(chips()[0]).toHaveTextContent('water moving, slowly');
  });

  it('is a full-screen sheet on phones', () => {
    setup();
    const sheet = screen.getByTestId('list-editor-sheet');
    expect(sheet.className).toMatch(/h-dvh/);
    expect(sheet.className).toMatch(/max-w-none/);
    expect(sheet.className).toMatch(/bg-neo-navy/);
  });

  it('offers a Share to Discover switch', () => {
    const { onSave } = setup({ initial: { ...emptyListDraft('en'), name: 'Fruits', words: [{ word: 'apple', canIntegrate: true }] } });
    fireEvent.click(screen.getByRole('switch', { name: /eduLibrary.share.toggle/ }));
    fireEvent.click(screen.getByTestId('list-save'));
    return waitFor(() => expect((onSave.mock.calls[0][0] as { isPublic: boolean }).isPublic).toBe(true));
  });
});
