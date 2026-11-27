import { render } from '@testing-library/react';
import GameplayPanel from '../GameplayPanel';

vi.mock('@gsap/react', () => ({ useGSAP: () => {} }));

describe('GameplayPanel', () => {
  it('shows the real gameplay clip with its poster, muted and looping', () => {
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    const { container } = render(
      <GameplayPanel isRTL={false} mode={{ side: 'left', accent: 'bg-neo-cyan', tag: 'Solo', title: 'One board', body: 'b', video: '/videos/a.mp4', poster: '/showcase3d/a.jpg' }} />,
    );
    const video = container.querySelector('video')!;
    expect(video).toHaveAttribute('src', '/videos/a.mp4');
    expect(video).toHaveAttribute('poster', '/showcase3d/a.jpg');
    expect(video.muted).toBe(true);
  });
});
