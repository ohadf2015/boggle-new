import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import WordListEditor from '../WordListEditor';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, p?: Record<string, unknown>) => (p ? `${key}:${Object.values(p).join(',')}` : key),
    language: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/useWordIntegration', () => ({
  useWordIntegration: () => ({
    checkWordIntegration: vi.fn((word: string) => ({ word, canIntegrate: true })),
  }),
}));

describe('WordListEditor — single words only', () => {
  it('refuses "Rely on" in the add box with the localized message and adds nothing', () => {
    const onWordsChange = vi.fn();
    render(<WordListEditor words={[]} onWordsChange={onWordsChange} language="en" showAddInput showAiFill={false} />);
    const input = screen.getByPlaceholderText('teacher.lesson.wordPlaceholder');
    fireEvent.change(input, { target: { value: 'Rely on' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onWordsChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('word-add-error')).toHaveTextContent('teacher.lesson.singleWordsOnly:"Rely on"');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: 'rely' } });
    expect(screen.queryByTestId('word-add-error')).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onWordsChange).toHaveBeenCalledWith([expect.objectContaining({ word: 'rely' })]);
  });

  it('flags multi-word terms already saved in an older list', () => {
    render(
      <WordListEditor
        words={[{ word: 'Hospice care', canIntegrate: false }, { word: 'rely', canIntegrate: true }]}
        onWordsChange={vi.fn()}
        language="en"
        showAiFill={false}
      />,
    );
    expect(screen.getAllByTestId('word-multi-word-flag')).toHaveLength(1);
  });
});
