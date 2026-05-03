import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MascotReaction } from '../MascotReaction';

// Mock next/image for testing
vi.mock('next/image', () => ({
  default: (props: any) => <img {...props} />,
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
