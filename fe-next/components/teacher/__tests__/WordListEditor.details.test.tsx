/**
 * WordListEditor — per-word "More" details (level, synonyms, antonyms, example),
 * lesson summary line, and the AI fill-in-missing button.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import WordListEditor from '../WordListEditor';
import type { VocabularyWord } from '@/lib/supabase/education';

vi.mock('@/hooks/useWordIntegration', () => ({
  useWordIntegration: () => ({
    checkWordIntegration: vi.fn((word: string) => ({ word, canIntegrate: true })),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Interpolating stub so the summary counts are observable
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}|${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')}` : key,
    language: 'en',
    dir: 'ltr',
  }),
}));

const onWordsChange = vi.fn();

const words: VocabularyWord[] = [
  { word: 'happy', definition: 'feeling joy', canIntegrate: true, synonyms: ['glad'], example: 'The ___ dog.' },
  { word: 'brave', definition: '', canIntegrate: true },
  { word: 'tiny', definition: 'very small', canIntegrate: true, level: 'challenge' },
];

const renderEditor = (props: Partial<React.ComponentProps<typeof WordListEditor>> = {}) =>
  render(<WordListEditor words={words} onWordsChange={onWordsChange} language="en" {...props} />);

const openDetails = (index: number) => {
  fireEvent.click(screen.getAllByRole('button', { name: 'teacher.wordDetails.more' })[index]);
  return screen.getByTestId(`word-details-${index}`);
};

describe('WordListEditor word details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('shows the lesson summary with per-field counts', () => {
    renderEditor();
    expect(screen.getByTestId('word-list-summary')).toHaveTextContent(
      'teacher.wordDetails.summary|count=3,definitions=2,synonyms=1,antonyms=0,examples=1'
    );
  });

  it('keeps details collapsed until "More" is pressed, then shows level / synonyms / antonyms / example', () => {
    renderEditor();
    expect(screen.queryByTestId('word-details-0')).not.toBeInTheDocument();

    const panel = openDetails(0);
    expect(within(panel).getByRole('radiogroup', { name: 'teacher.wordDetails.level' })).toBeInTheDocument();
    expect(within(panel).getByPlaceholderText('teacher.wordDetails.synonymsPlaceholder')).toHaveValue('glad');
    expect(within(panel).getByPlaceholderText('teacher.wordDetails.antonymsPlaceholder')).toHaveValue('');
    expect(within(panel).getByPlaceholderText('teacher.wordDetails.examplePlaceholder')).toHaveValue('The ___ dog.');
    expect(within(panel).getByText('teacher.wordDetails.exampleHelp')).toBeInTheDocument();
  });

  it('defaults the level to Core and reflects a stored level', () => {
    renderEditor();
    const core = within(openDetails(1)).getByRole('radio', { name: 'teacher.wordDetails.levelCore' });
    expect(core).toHaveAttribute('aria-checked', 'true');

    const challenge = within(openDetails(2)).getByRole('radio', { name: 'teacher.wordDetails.levelChallenge' });
    expect(challenge).toHaveAttribute('aria-checked', 'true');
  });

  it('writes the level tag onto the word', () => {
    renderEditor();
    fireEvent.click(within(openDetails(1)).getByRole('radio', { name: 'teacher.wordDetails.levelSupport' }));
    expect(onWordsChange).toHaveBeenLastCalledWith([words[0], { ...words[1], level: 'support' }, words[2]]);
  });

  it('serialises comma-separated synonyms and antonyms into string[]', () => {
    renderEditor();
    const panel = openDetails(1);
    fireEvent.change(within(panel).getByPlaceholderText('teacher.wordDetails.synonymsPlaceholder'), {
      target: { value: 'bold, fearless , ' },
    });
    expect(onWordsChange).toHaveBeenLastCalledWith([words[0], { ...words[1], synonyms: ['bold', 'fearless'] }, words[2]]);

    fireEvent.change(within(panel).getByPlaceholderText('teacher.wordDetails.antonymsPlaceholder'), {
      target: { value: 'cowardly' },
    });
    expect(onWordsChange).toHaveBeenLastCalledWith([words[0], { ...words[1], antonyms: ['cowardly'] }, words[2]]);
  });

  it('auto-inserts ___ into the example on blur when the sentence spells the word out', () => {
    renderEditor();
    const example = within(openDetails(1)).getByPlaceholderText('teacher.wordDetails.examplePlaceholder');
    fireEvent.change(example, { target: { value: 'The brave knight fought.' } });
    fireEvent.blur(example);
    expect(onWordsChange).toHaveBeenLastCalledWith([words[0], { ...words[1], example: 'The ___ knight fought.' }, words[2]]);
  });

  it('leaves an example that already has a blank alone', () => {
    renderEditor();
    const example = within(openDetails(1)).getByPlaceholderText('teacher.wordDetails.examplePlaceholder');
    fireEvent.change(example, { target: { value: 'A ___ knight.' } });
    fireEvent.blur(example);
    expect(onWordsChange).toHaveBeenLastCalledWith([words[0], { ...words[1], example: 'A ___ knight.' }, words[2]]);
  });

  describe('AI fill', () => {
    it('is hidden when every word is already complete', () => {
      const complete: VocabularyWord[] = [
        { word: 'a', definition: 'd', canIntegrate: true, synonyms: ['s'], antonyms: ['x'], example: 'The ___.' },
      ];
      renderEditor({ words: complete });
      expect(screen.queryByRole('button', { name: 'teacher.wordDetails.aiFill' })).not.toBeInTheDocument();
    });

    it('calls the enrich API with the incomplete words and only fills empty fields', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          enrichment: {
            happy: { definition: 'SHOULD NOT OVERWRITE', antonyms: ['sad'] },
            brave: { definition: 'not afraid', synonyms: ['bold'], example: 'The ___ knight.' },
          },
        }),
      });
      vi.stubGlobal('fetch', fetchMock);

      renderEditor();
      fireEvent.click(screen.getByRole('button', { name: 'teacher.wordDetails.aiFill' }));

      await waitFor(() => expect(onWordsChange).toHaveBeenCalled());

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/education/lesson-enrich',
        expect.objectContaining({ method: 'POST' })
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body).toEqual({ words: ['happy', 'brave', 'tiny'], language: 'en' });

      const merged = onWordsChange.mock.calls[0][0] as VocabularyWord[];
      expect(merged[0].definition).toBe('feeling joy');
      expect(merged[0].antonyms).toEqual(['sad']);
      expect(merged[1]).toEqual({ ...words[1], definition: 'not afraid', synonyms: ['bold'], example: 'The ___ knight.' });

      // review hint + highlight on the filled fields
      expect(screen.getByText('teacher.wordDetails.aiFilledNote')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText(/add definition|definitionPlaceholder/i)[1]).toHaveAttribute('data-ai-filled', 'true');
    });

    it('surfaces an error when the API fails', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'boom' }) }));
      renderEditor();
      fireEvent.click(screen.getByRole('button', { name: 'teacher.wordDetails.aiFill' }));
      await waitFor(() => expect(screen.getByText('teacher.wordDetails.aiError')).toBeInTheDocument());
      expect(onWordsChange).not.toHaveBeenCalled();
    });
  });
});
