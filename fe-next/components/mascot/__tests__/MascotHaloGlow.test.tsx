import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MascotHaloGlow } from '../MascotHaloGlow';

describe('MascotHaloGlow', () => {
  it('renders children', () => {
    render(
      <MascotHaloGlow>
        <span data-testid="content">hello</span>
      </MascotHaloGlow>,
    );
    expect(screen.getByTestId('content')).toHaveTextContent('hello');
  });

  it('renders an aria-hidden halo span', () => {
    const { container } = render(
      <MascotHaloGlow>
        <div />
      </MascotHaloGlow>,
    );
    const halo = container.querySelector('[aria-hidden="true"]');
    expect(halo).not.toBeNull();
  });

  it('applies tone-specific class on the halo for keyframe scoping', () => {
    const { container } = render(
      <MascotHaloGlow tone="lime-cyan" intensity="bold">
        <div />
      </MascotHaloGlow>,
    );
    expect(container.querySelector('.lc-halo-lime-cyan-bold')).not.toBeNull();
  });

  it('suppresses animation when paused=true', () => {
    const { container } = render(
      <MascotHaloGlow paused>
        <div />
      </MascotHaloGlow>,
    );
    const halo = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(halo.style.animation).toBe('');
  });

  it('renders inline @keyframes scoped to the variant key', () => {
    const { container } = render(
      <MascotHaloGlow tone="purple-pink" intensity="subtle">
        <div />
      </MascotHaloGlow>,
    );
    const style = container.querySelector('style')?.textContent ?? '';
    expect(style).toContain('@keyframes mascotHaloPulse_purple-pink_subtle');
    expect(style).toContain('prefers-reduced-motion');
  });

  it('merges wrapperStyle but keeps position:relative non-negotiable', () => {
    const { container } = render(
      <MascotHaloGlow wrapperStyle={{ width: '100%', height: '100%', position: 'absolute' }}>
        <div />
      </MascotHaloGlow>,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('100%');
    expect(wrapper.style.height).toBe('100%');
    // even though caller tried position:absolute, the component pins it back to relative
    expect(wrapper.style.position).toBe('relative');
  });
});
