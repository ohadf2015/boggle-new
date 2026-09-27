// @vitest-environment jsdom
import { vi, type Mock, } from 'vitest';
/**
 * Shared Remotion Primitives Tests
 *
 * Uses vi.mock('remotion') with vi.fn() exports so beforeEach can override values.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('remotion', () => ({
  __esModule: true,
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, durationInFrames: 90, width: 1920, height: 1080 })),
  interpolate: vi.fn((frame: number, inputRange: number[], outputRange: number[]) => {
    if (frame <= inputRange[0]) return outputRange[0];
    if (frame >= inputRange[inputRange.length - 1]) return outputRange[outputRange.length - 1];
    const [inMin, inMax] = inputRange;
    const [outMin, outMax] = outputRange;
    const t = (frame - inMin) / (inMax - inMin);
    const clamped = Math.max(0, Math.min(1, t));
    return outMin + clamped * (outMax - outMin);
  }),
  spring: vi.fn(() => 0),
  staticFile: vi.fn((path: string) => path),
  AbsoluteFill: ({ children, style, ...rest }: any) => (
    <div data-testid={rest['data-testid'] || 'absolute-fill'} style={style}>
      {children}
    </div>
  ),
}));


import * as remotion from 'remotion';

// Mock fonts
vi.mock('../fonts', () => ({
  fredokaFamily: 'Fredoka, sans-serif',
  rubikFamily: 'Rubik, sans-serif',
}));

beforeEach(() => {
  vi.mocked(remotion.useVideoConfig).mockReturnValue({ width: 1280, height: 720, fps: 30, durationInFrames: 240 });
  vi.mocked(remotion.spring).mockReturnValue(1);
  vi.mocked(remotion.staticFile).mockImplementation((path: string) => `/static/${path}`);
});

import { BackgroundGlow } from '../primitives/BackgroundGlow';
import { ParticleLayer } from '../primitives/ParticleLayer';
import { StatItem } from '../primitives/StatItem';
import { SparkleField } from '../primitives/SparkleField';
import { RewardDisplay } from '../primitives/RewardDisplay';
import { FlashEffect } from '../primitives/FlashEffect';
import { ExplosionRing } from '../primitives/ExplosionRing';
import { ShatterFragment } from '../primitives/ShatterFragment';
import { TitleReveal } from '../primitives/TitleReveal';
import { StatsPanel } from '../primitives/StatsPanel';
import { Confetti } from '../primitives/Confetti';

describe('BackgroundGlow', () => {
  it('should render glow element with testid', () => {
    render(<BackgroundGlow color="#FFE135" opacity={0.8} />);
    const glow = screen.getByTestId('background-glow');
    expect(glow).toBeInTheDocument();
  });

  it('should apply opacity', () => {
    render(<BackgroundGlow color="#FF0000" opacity={0.5} />);
    const glow = screen.getByTestId('background-glow');
    expect(glow.style.opacity).toBe('0.5');
  });

  it('should position absolutely with inset 0', () => {
    render(<BackgroundGlow color="#00FF00" opacity={1} />);
    const glow = screen.getByTestId('background-glow');
    expect(glow.style.position).toBe('absolute');
    expect(['0', '0px']).toContain(glow.style.inset);
  });
});

describe('ParticleLayer', () => {
  it('should render correct number of particles', () => {
    render(
      <ParticleLayer count={15} color="#FFE135" frame={60} width={1280} height={720} />
    );
    const particles = screen.getAllByTestId('particle');
    expect(particles).toHaveLength(15);
  });

  it('should use particle color', () => {
    render(
      <ParticleLayer count={3} color="#FF0000" frame={60} width={1280} height={720} />
    );
    const particles = screen.getAllByTestId('particle');
    particles.forEach((p) => {
      expect(p.style.backgroundColor).toBe('rgb(255, 0, 0)');
    });
  });
});

describe('StatItem', () => {
  it('should render label and value', () => {
    render(
      <StatItem label="Words Found" value={42} delay={0} frame={60} fps={30} />
    );
    const item = screen.getByTestId('stat-item');
    expect(item).toBeInTheDocument();
    expect(screen.getByText('Words Found')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should use custom label color', () => {
    render(
      <StatItem label="Score" value={100} delay={0} frame={60} fps={30} labelColor="#FF6B35" />
    );
    expect(screen.getByText('Score').style.color).toBe('rgb(255, 107, 53)');
  });
});

describe('SparkleField', () => {
  it('should render correct number of sparkles with seeded placement', () => {
    render(<SparkleField count={10} color="#FFE135" seed={42} frame={60} />);
    const sparkles = screen.getAllByTestId('sparkle');
    expect(sparkles).toHaveLength(10);
  });

  it('should produce same layout with same seed', () => {
    const { unmount } = render(<SparkleField count={5} color="#FFF" seed={42} frame={60} />);
    const first = screen.getAllByTestId('sparkle').map((s) => s.style.left);
    unmount();

    render(<SparkleField count={5} color="#FFF" seed={42} frame={60} />);
    const second = screen.getAllByTestId('sparkle').map((s) => s.style.left);
    expect(first).toEqual(second);
  });
});

describe('RewardDisplay', () => {
  it('should render reward items', () => {
    const rewards = [
      { label: 'GOLD', value: 100, color: '#FFD700' },
      { label: 'XP', value: 50, color: '#00FF88' },
    ];
    render(<RewardDisplay rewards={rewards} frame={60} fps={30} />);
    expect(screen.getByText('+100')).toBeInTheDocument();
    expect(screen.getByText('GOLD')).toBeInTheDocument();
    expect(screen.getByText('+50')).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
  });

  it('should render empty when no rewards', () => {
    render(<RewardDisplay rewards={[]} frame={60} fps={30} />);
    const display = screen.getByTestId('reward-display');
    expect(display.children).toHaveLength(0);
  });
});

describe('FlashEffect', () => {
  it('should render with correct opacity', () => {
    render(<FlashEffect intensity={0.6} />);
    const flash = screen.getByTestId('flash-effect');
    expect(flash.style.opacity).toBe('0.6');
  });
});

describe('ExplosionRing', () => {
  it('should render ring-3 element', () => {
    render(<ExplosionRing frame={15} color="#FFE135" delay={0} size={100} />);
    const ring = screen.getByTestId('explosion-ring');
    expect(ring).toBeInTheDocument();
    // jsdom may convert hex to rgb
    const border = ring.style.border.toLowerCase();
    expect(border.includes('#ffe135') || border.includes('rgb(255, 225, 53)')).toBe(true);
  });
});

describe('ShatterFragment', () => {
  it('should render fragment', () => {
    render(
      <ShatterFragment x={640} y={360} size={30} rotation={1} frame={15} color="#FF0000" />
    );
    const frag = screen.getByTestId('shatter-fragment');
    expect(frag).toBeInTheDocument();
    expect(frag.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });
});

describe('TitleReveal', () => {
  it('should render title text', () => {
    render(
      <TitleReveal text="VICTORY!" color="#FFE135" fontSize={96} frame={30} fps={30} />
    );
    expect(screen.getByText('VICTORY!')).toBeInTheDocument();
  });

  it('should use specified color', () => {
    const { container } = render(
      <TitleReveal text="TEST" color="#FF6B35" fontSize={72} frame={30} fps={30} />
    );
    expect(container.innerHTML).toContain('#FF6B35');
  });
});

describe('StatsPanel', () => {
  it('should render children inside panel', () => {
    render(
      <StatsPanel borderColor="#FFE135" frame={60} fps={30}>
        <div data-testid="child">Test Child</div>
      </StatsPanel>
    );
    expect(screen.getByTestId('stats-panel')).toBeInTheDocument();
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should use specified border color', () => {
    render(
      <StatsPanel borderColor="#FF6B35" frame={60} fps={30}>
        <span>Content</span>
      </StatsPanel>
    );
    const panel = screen.getByTestId('stats-panel');
    const border = panel.style.border.toLowerCase();
    expect(border.includes('#ff6b35') || border.includes('rgb(255, 107, 53)')).toBe(true);
  });
});

describe('Confetti', () => {
  it('should render confetti pieces', () => {
    const particles = [
      { x: 100, y: -20, color: '#FFD700', speed: 3, wobble: 0, delay: 0 },
      { x: 200, y: -40, color: '#FF1493', speed: 4, wobble: 1, delay: 5 },
    ];
    render(<Confetti particles={particles} frame={30} />);
    const pieces = screen.getAllByTestId('confetti-piece');
    expect(pieces).toHaveLength(2);
  });

  it('should render empty when no particles', () => {
    const { container } = render(<Confetti particles={[]} frame={30} />);
    expect(container.querySelectorAll('[data-testid="confetti-piece"]')).toHaveLength(0);
  });
});
