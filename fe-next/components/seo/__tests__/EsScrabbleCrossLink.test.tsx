// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EsScrabbleCrossLink } from '../EsScrabbleCrossLink';

describe('EsScrabbleCrossLink', () => {
  it('renders nothing when locale is not es', () => {
    const { container } = render(<EsScrabbleCrossLink locale="en" anchorVariant="words" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for he, sv, ja', () => {
    expect(render(<EsScrabbleCrossLink locale="he" anchorVariant="words" />).container.firstChild).toBeNull();
    expect(render(<EsScrabbleCrossLink locale="sv" anchorVariant="words" />).container.firstChild).toBeNull();
    expect(render(<EsScrabbleCrossLink locale="ja" anchorVariant="words" />).container.firstChild).toBeNull();
  });

  it('renders a link to /es/juego-de-palabras-multijugador with words variant anchor', () => {
    const { container } = render(<EsScrabbleCrossLink locale="es" anchorVariant="words" />);
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/es/juego-de-palabras-multijugador');
    expect(link!.textContent).toMatch(/Scrabble.*español.*multijugador/i);
  });

  it('renders different anchor text for anagram variant', () => {
    const { container } = render(<EsScrabbleCrossLink locale="es" anchorVariant="anagram" />);
    expect(container.querySelector('a')!.textContent).toMatch(/Alternativa.*Scrabble/i);
  });

  it('renders different anchor text for daily variant', () => {
    const { container } = render(<EsScrabbleCrossLink locale="es" anchorVariant="daily" />);
    expect(container.querySelector('a')!.textContent).toMatch(/tiempo real|online/i);
  });

  it('three variants produce three distinct anchor texts (anchor diversity)', () => {
    const w = render(<EsScrabbleCrossLink locale="es" anchorVariant="words" />).container.querySelector('a')!.textContent;
    const a = render(<EsScrabbleCrossLink locale="es" anchorVariant="anagram" />).container.querySelector('a')!.textContent;
    const d = render(<EsScrabbleCrossLink locale="es" anchorVariant="daily" />).container.querySelector('a')!.textContent;
    expect(new Set([w, a, d]).size).toBe(3);
  });

  it('renders leaderboard variant with ranking-themed anchor', () => {
    const { container } = render(<EsScrabbleCrossLink locale="es" anchorVariant="leaderboard" />);
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/es/juego-de-palabras-multijugador');
    expect(link.textContent).toMatch(/Scrabble|ranking|clasificación/i);
  });

  it('renders blog variant with contextual anchor for Netflix-style cross-link', () => {
    const { container } = render(<EsScrabbleCrossLink locale="es" anchorVariant="blog" />);
    const link = container.querySelector('a')!;
    expect(link.getAttribute('href')).toBe('/es/juego-de-palabras-multijugador');
    expect(link.textContent).toMatch(/Scrabble|alternativa/i);
  });

  it('all five variants produce five distinct anchor texts', () => {
    const variants = ['words', 'anagram', 'daily', 'leaderboard', 'blog'] as const;
    const texts = variants.map(v =>
      render(<EsScrabbleCrossLink locale="es" anchorVariant={v} />).container.querySelector('a')!.textContent
    );
    expect(new Set(texts).size).toBe(5);
  });
});
