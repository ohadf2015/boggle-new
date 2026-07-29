import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { WordTowerMinimap } from './WordTowerMinimap';

afterEach(cleanup);

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k} ${JSON.stringify(p)}` : k);

describe('WordTowerMinimap', () => {
  it('shows the climber height caption', () => {
    render(<WordTowerMinimap heightM={294} viewM={294} personalBestM={300} onScrollTop={() => {}} t={t} />);
    expect(screen.getByText(/294\s*m/)).toBeTruthy();
  });

  it('renders the biome zone bands of the mini tower', () => {
    const { container } = render(
      <WordTowerMinimap heightM={600} viewM={600} personalBestM={0} onScrollTop={() => {}} t={t} />,
    );
    // city/sky/stratosphere/orbit/nebula bands → several coloured segments
    expect(container.querySelectorAll('[data-zone]').length).toBeGreaterThan(2);
  });

  it('scrolls to the top when tapped (doubles as a back-to-top affordance)', () => {
    const onScrollTop = vi.fn();
    render(<WordTowerMinimap heightM={100} viewM={20} personalBestM={0} onScrollTop={onScrollTop} t={t} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onScrollTop).toHaveBeenCalledOnce();
  });
});
