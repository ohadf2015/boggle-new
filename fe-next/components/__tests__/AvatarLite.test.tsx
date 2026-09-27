import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AvatarLite from '../AvatarLite';

describe('AvatarLite', () => {
  it('paints bgColor from the config without loading AvatarRenderer', () => {
    const { getByTestId } = render(
      <AvatarLite userId="u1" customAvatar={{ bgColor: '#FF6B35' }} pixelSize={44} />,
    );
    const el = getByTestId('avatar-lite');
    expect(el).toHaveStyle({ backgroundColor: '#FF6B35', width: '44px', height: '44px' });
    expect(el.getAttribute('data-user-id')).toBe('u1');
    expect(el.getAttribute('data-has-custom')).toBe('true');
  });

  it('seeds a palette color when no config is given', () => {
    const { getByTestId } = render(<AvatarLite userId="guest-seed" />);
    const el = getByTestId('avatar-lite');
    expect(el.getAttribute('data-has-custom')).toBe('false');
    expect(el.style.backgroundColor).toBeTruthy();
  });
});

describe('AvatarLite real face', () => {
  const uuid = '8f14e45f-ceea-467a-9a37-0a2b4c6d8e10';

  it('overlays the server-rendered PNG for a player with a stored config', () => {
    // Given a real player id and their avatar config
    const { container } = render(
      <AvatarLite userId={uuid} customAvatar={{ bgColor: '#FF6B35', skinColor: '#aa7755' }} />,
    );
    // Then the circle shows their actual avatar, not just a flat color
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toMatch(new RegExp(`^/api/avatar/png/${uuid}\\?v=`));
  });

  it('cache-busts when the config changes', () => {
    const a = render(<AvatarLite userId={uuid} customAvatar={{ bgColor: '#111111' }} />);
    const b = render(<AvatarLite userId={uuid} customAvatar={{ bgColor: '#222222' }} />);
    expect(a.container.querySelector('img')!.getAttribute('src')).not.toBe(
      b.container.querySelector('img')!.getAttribute('src'),
    );
  });

  it('shows the same seeded face Avatar uses for guests, seeds and players without a config', () => {
    // Given no stored config, the full Avatar draws getSeededAvatarConfig(userId) —
    // AvatarLite must show that face too, never a bare disc.
    const guest = render(<AvatarLite userId="guest-seed" customAvatar={{ bgColor: '#111' }} />).container.querySelector('img');
    expect(guest!.getAttribute('src')).toMatch(/^\/api\/avatar\/png\/guest-seed\?v=/);
    expect(render(<AvatarLite userId={uuid} />).container.querySelector('img')).not.toBeNull();
  });

  it('keeps the flat circle when there is no id or an unsafe one', () => {
    expect(render(<AvatarLite />).container.querySelector('img')).toBeNull();
    expect(render(<AvatarLite userId="has space" />).container.querySelector('img')).toBeNull();
  });
});
