import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import AvatarLite from '../AvatarLite';

// The PNG can 404 before React hydrates, so onError never fires and the
// browser's broken-image glyph shows over the colored disc.
describe('AvatarLite hides a PNG that already failed before hydration', () => {
  const uuid = '8f14e45f-ceea-467a-9a37-0a2b4c6d8e10';
  const cfg = { bgColor: '#FF6B35', skinColor: '#aa7755' };

  afterEach(() => vi.restoreAllMocks());

  it('given an image that finished loading with no pixels, when mounted, then it is hidden', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(0);
    const { container } = render(<AvatarLite userId={uuid} customAvatar={cfg} />);
    expect(container.querySelector('img')?.style.display).toBe('none');
  });

  it('given an image that loaded fine, when mounted, then it stays visible', () => {
    vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(256);
    const { container } = render(<AvatarLite userId={uuid} customAvatar={cfg} />);
    expect(container.querySelector('img')?.style.display).not.toBe('none');
  });
});
