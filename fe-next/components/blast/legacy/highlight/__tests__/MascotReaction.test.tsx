import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MascotReaction } from '../MascotReaction';

// Mock next/image for testing — strip Next-specific props before forwarding to native img
vi.mock('next/image', () => ({
  __esModule: true,
  default: (props: { src: string; alt: string; width?: number; height?: number }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.src} alt={props.alt} width={props.width} height={props.height} />
  ),
}));

describe('MascotReaction', () => {
  it('shows mindblown mood for epicness > 500', () => {
    const { container } = render(<MascotReaction epicness={800} visible={true} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('mindblown');
  });

  it('shows cool mood for epicness <= 500', () => {
    const { container } = render(<MascotReaction epicness={200} visible={true} />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect(img).toBeTruthy();
    expect(img.src).toContain('cool');
  });

  it('hidden when visible=false', () => {
    const { container } = render(<MascotReaction epicness={500} visible={false} />);
    expect(container.querySelector('img')).toBeNull();
  });
});
