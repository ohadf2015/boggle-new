// @vitest-environment happy-dom
import React from 'react';
import { vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import TvJoinBar from '../TvJoinBar';

vi.mock('framer-motion', () => ({
  m: {
    div: React.forwardRef(function MotionDiv({ children, className, role, ...rest }: any, ref: any) {
      return (
        <div ref={ref} className={className} role={role} data-testid={rest['data-testid']} aria-labelledby={rest['aria-labelledby']} aria-label={rest['aria-label']}>
          {children}
        </div>
      );
    }),
  },
}));
vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <div data-testid="qr-code" /> }));
vi.mock('../../../../components/ui/AnimatedCounter', () => ({ AnimatedCounter: ({ value, className }: any) => <span className={className}>{value}</span> }));

const t = (key: string) => key;
const props = { gameCode: 'S32RH6', playerCount: 12, language: 'en', baseUrl: 'https://www.lexiclash.live', t, dense: true };

describe('TvJoinBar classroom skin', () => {
  it('given a public room, then the purple broadcast bar renders exactly as before', () => {
    const { container } = render(<TvJoinBar {...props} classroom={false} />);
    expect(container.innerHTML).toMatchSnapshot();
  });

  it('given a classroom, then join, code and players are cream cards on the sky page, not a purple band', () => {
    const { container } = render(<TvJoinBar {...props} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.className).not.toContain('bg-neo-purple');
    expect(bar.className).toContain('bg-edu-page');
    for (const id of ['tv-join-card-address', 'tv-join-card-code', 'tv-join-card-players']) {
      expect(screen.getByTestId(id)).toHaveClass('bg-edu-surface', 'border-neo-black');
    }
  });

  it('given a classroom, then the code is one letter tile per character and still reads as one status', () => {
    render(<TvJoinBar {...props} />);
    const code = screen.getByRole('status');
    expect(code).toHaveAttribute('aria-labelledby', 'game-code-label');
    const tiles = within(code).getAllByTestId('tv-code-tile');
    expect(tiles.map((tile) => tile.textContent).join('')).toBe('S32RH6');
    expect(tiles[0]).toHaveClass('bg-edu-tile', 'text-neo-black');
  });

  it('given a classroom, then no label is cream ink on the light page', () => {
    const { container } = render(<TvJoinBar {...props} />);
    expect(container.innerHTML).not.toMatch(/text-neo-cream/);
  });
});
