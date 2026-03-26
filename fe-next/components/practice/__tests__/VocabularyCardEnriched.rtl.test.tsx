import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VocabularyCardEnriched } from '../VocabularyCardEnriched';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'rtl', language: 'he' }),
}));

vi.mock('@/components/practice/PronunciationButton', () => ({
  PronunciationButton: () => null,
}));

const mockWord = {
  word: 'שלום',
  definition: 'Hello',
  partOfSpeech: 'noun',
  examples: [{ text: 'שלום עולם', translation: 'Hello world' }],
};

describe('VocabularyCardEnriched RTL', () => {
  it('applies dir=rtl on root element when language is Hebrew', () => {
    const { container } = render(<VocabularyCardEnriched word={mockWord} />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
    expect(container.textContent).toContain('שלום');
  });
});
