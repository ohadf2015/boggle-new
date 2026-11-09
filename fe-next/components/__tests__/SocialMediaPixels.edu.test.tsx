import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/components/SocialMediaPixels');

let mockPath = '/en/daily';
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
vi.mock('next/script', () => ({
  default: ({ id }: { id: string }) => <script data-testid={id} />,
}));

async function load() {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_FB_PIXEL_ID', 'fb-1');
  vi.stubEnv('NEXT_PUBLIC_TIKTOK_PIXEL_ID', 'tt-1');
  return import('../SocialMediaPixels');
}

type PixelWindow = Window & { fbq?: ReturnType<typeof vi.fn>; ttq?: { track: ReturnType<typeof vi.fn> } };
const w = window as PixelWindow;

describe('ad pixels stay off the classroom product', () => {
  beforeEach(() => {
    w.fbq = vi.fn();
    w.ttq = { track: vi.fn() };
  });
  afterEach(() => {
    delete w.fbq;
    delete w.ttq;
    window.history.replaceState(null, '', '/');
    vi.unstubAllEnvs();
  });

  it('loads both pixels on a game page', async () => {
    mockPath = '/en/daily';
    const { SocialMediaPixels } = await load();
    const { queryByTestId } = render(<SocialMediaPixels />);
    expect(queryByTestId('facebook-pixel')).not.toBeNull();
    expect(queryByTestId('tiktok-pixel')).not.toBeNull();
  });

  it.each(['/he/student/quick-play', '/en/join/ABC123', '/en/teacher', '/en/education/live', '/en/report/x'])(
    'loads no pixel on %s',
    async (p) => {
      mockPath = p;
      const { SocialMediaPixels } = await load();
      const { container } = render(<SocialMediaPixels />);
      expect(container.querySelector('script')).toBeNull();
      expect(container.querySelector('img')).toBeNull();
    },
  );

  it('revokes an already-loaded Facebook pixel once the visitor walks into a class', async () => {
    mockPath = '/he/student';
    const { SocialMediaPixels } = await load();
    render(<SocialMediaPixels />);
    expect(w.fbq).toHaveBeenCalledWith('consent', 'revoke');
  });

  it('sends no conversion event from a classroom page', async () => {
    window.history.replaceState(null, '', '/en/student');
    const { socialEvents } = await load();
    socialEvents.completeRegistration('u1');
    expect(w.fbq).not.toHaveBeenCalled();
    expect(w.ttq!.track).not.toHaveBeenCalled();
  });

  it('still sends conversion events from game pages', async () => {
    window.history.replaceState(null, '', '/en/daily');
    const { socialEvents } = await load();
    socialEvents.completeRegistration('u1');
    expect(w.fbq).toHaveBeenCalledWith('track', 'CompleteRegistration', { user_id: 'u1' });
  });
});
