import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WordContextRow } from '../WordContextRow';

describe('WordContextRow', () => {
  describe('when both props are absent', () => {
    it('renders nothing', () => {
      const { container } = render(<WordContextRow />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('when only partOfSpeech is given', () => {
    it('renders the part of speech text', () => {
      render(<WordContextRow partOfSpeech="noun" />);
      expect(screen.getByText('noun')).toBeInTheDocument();
    });

    it('does not render the separator', () => {
      const { container } = render(<WordContextRow partOfSpeech="noun" />);
      // The aria-hidden separator should not exist
      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator).toBeNull();
    });

    it('does not render an example', () => {
      const { container } = render(<WordContextRow partOfSpeech="noun" />);
      const italic = container.querySelector('span.italic');
      expect(italic).toBeNull();
    });
  });

  describe('when only example is given', () => {
    it('renders the example in italics', () => {
      const { container } = render(<WordContextRow example="She read the book." />);
      const italic = container.querySelector('span.italic');
      expect(italic).toBeInTheDocument();
    });

    it('wraps the example in curly quotes', () => {
      render(<WordContextRow example="She read the book." />);
      // The rendered text should include the example text inside quotes
      expect(screen.getByText(/She read the book\./)).toBeInTheDocument();
    });

    it('does not render the separator', () => {
      const { container } = render(<WordContextRow example="She read the book." />);
      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator).toBeNull();
    });
  });

  describe('when both props are given', () => {
    it('renders the part of speech', () => {
      render(<WordContextRow partOfSpeech="verb" example="She runs daily." />);
      expect(screen.getByText('verb')).toBeInTheDocument();
    });

    it('renders the example', () => {
      render(<WordContextRow partOfSpeech="verb" example="She runs daily." />);
      expect(screen.getByText(/She runs daily\./)).toBeInTheDocument();
    });

    it('renders the separator between them', () => {
      const { container } = render(
        <WordContextRow partOfSpeech="verb" example="She runs daily." />
      );
      const separator = container.querySelector('[aria-hidden="true"]');
      expect(separator).toBeInTheDocument();
      expect(separator).toHaveTextContent('·');
    });

    it('example text is wrapped in curly quote characters', () => {
      const { container } = render(
        <WordContextRow partOfSpeech="adjective" example="A bright day." />
      );
      const italic = container.querySelector('span.italic');
      expect(italic).toBeInTheDocument();
      // Should contain opening and closing curly quotes
      expect(italic!.textContent).toContain('\u201C'); // "
      expect(italic!.textContent).toContain('\u201D'); // "
      expect(italic!.textContent).toContain('A bright day.');
    });
  });
});
