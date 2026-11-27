import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AcademyBackdrop } from '../AcademyBackdrop';

const backdrop = () => screen.getByTestId('academy-backdrop');

describe('<AcademyBackdrop>', () => {
  it('Given the map, Then a phone held upright gets the portrait art and everything else the landscape art', () => {
    const { container } = render(<AcademyBackdrop art="map" />);
    const source = container.querySelector('source');
    expect(source).toHaveAttribute('media', '(orientation: portrait)');
    expect(source).toHaveAttribute('srcset', '/images/education/academy-map-portrait.webp');
    expect(container.querySelector('img')).toHaveAttribute('src', '/images/education/academy-map-landscape.webp');
  });

  it.each([
    ['arena', '/images/education/arena-lobby-bg.webp'],
    ['podium', '/images/education/podium-bg.webp'],
  ] as const)('Given the %s, Then it paints that scene', (art, src) => {
    const { container } = render(<AcademyBackdrop art={art} />);
    expect(container.querySelector('img')).toHaveAttribute('src', src);
    expect(backdrop()).toHaveAttribute('data-art', art);
  });

  it('sits behind its container: decorative, untouchable, below the content, never faded in', () => {
    render(<AcademyBackdrop art="arena" />);
    expect(backdrop()).toHaveAttribute('aria-hidden', 'true');
    expect(backdrop().className).toContain('pointer-events-none');
    expect(backdrop().className).toContain('-z-10');
    expect(backdrop().className).toContain('absolute');
    expect(backdrop().className).toContain('bg-edu-surface');
    expect(backdrop().innerHTML).not.toContain('opacity-0');
  });
});
