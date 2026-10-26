/**
 * ClassCarousel — a scroll-snap track of class cards with arrows and a
 * position indicator. The browser owns swiping and RTL scroll direction; the
 * arrows only ask the target card to scroll into view.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, a?: unknown, p?: Record<string, unknown>) => {
      const params = (typeof a === 'object' ? a : p) as Record<string, unknown> | undefined;
      return params ? `${k}:${JSON.stringify(params)}` : k;
    },
    language: 'en',
  }),
}));
const motion = { reduced: false };
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({
  useEduReducedMotion: () => motion.reduced,
}));

import { ClassCarousel } from '../ClassCarousel';

const scrollIntoView = vi.fn();
const slides = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ key: `c${i}`, node: <button type="button">card {i}</button> }));

describe('ClassCarousel', () => {
  beforeEach(() => {
    scrollIntoView.mockClear();
    motion.reduced = false;
    Element.prototype.scrollIntoView = scrollIntoView;
  });

  it('Given three classes on a phone, Then all cards are in one scrollable track and the first page is shown', () => {
    render(<ClassCarousel perView={1} slides={slides(3)} />);
    expect(screen.getByTestId('class-carousel-track')).toBeInTheDocument();
    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(screen.getByTestId('class-carousel-status')).toHaveTextContent('"page":1');
    expect(screen.getByTestId('class-carousel-status')).toHaveTextContent('"pages":3');
    expect(screen.getByTestId('class-carousel-prev')).toBeDisabled();
  });

  it('Given everything fits in one view, Then there are no arrows or indicator', () => {
    render(<ClassCarousel perView={3} slides={slides(3)} />);
    expect(screen.queryByTestId('class-carousel-nav')).toBeNull();
    expect(screen.getByTestId('class-carousel-track')).toBeInTheDocument();
  });

  it('When next is pressed, Then the next page\'s first card scrolls to the start edge, smoothly', () => {
    render(<ClassCarousel perView={2} slides={slides(5)} />);
    fireEvent.click(screen.getByTestId('class-carousel-next'));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getAllByRole('group')[2]);
    expect(screen.getByTestId('class-carousel-status')).toHaveTextContent('"page":2');
    expect(screen.getByTestId('class-carousel-prev')).not.toBeDisabled();
  });

  it('Given reduced motion, Then the arrows jump instead of gliding', () => {
    motion.reduced = true;
    render(<ClassCarousel perView={1} slides={slides(2)} />);
    fireEvent.click(screen.getByTestId('class-carousel-next'));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', inline: 'start', block: 'nearest' });
  });

  it('Given the last page, Then next is disabled', () => {
    render(<ClassCarousel perView={1} slides={slides(2)} />);
    fireEvent.click(screen.getByTestId('class-carousel-next'));
    expect(screen.getByTestId('class-carousel-next')).toBeDisabled();
  });

  it('Given the track, Then it is a keyboard-focusable named region the browser can scroll with arrow keys', () => {
    render(<ClassCarousel perView={1} slides={slides(2)} label="Your classes" />);
    const track = screen.getByRole('region', { name: 'Your classes' });
    expect(track).toHaveAttribute('tabindex', '0');
    expect(track.className).toMatch(/snap-x/);
    expect(track.className).toMatch(/overflow-x-auto/);
  });

  it('Given reduced motion, Then the track does not smooth-scroll on its own', () => {
    motion.reduced = true;
    render(<ClassCarousel perView={1} slides={slides(2)} />);
    expect(screen.getByTestId('class-carousel-track').className).not.toMatch(/scroll-smooth/);
  });

  it('Given a trailing add seat, Then it renders after the cards and is not counted as a page', () => {
    render(<ClassCarousel perView={3} slides={slides(2)} trailing={<span>add</span>} />);
    expect(screen.getByText('add')).toBeInTheDocument();
    expect(screen.queryByTestId('class-carousel-nav')).toBeNull();
  });
});
