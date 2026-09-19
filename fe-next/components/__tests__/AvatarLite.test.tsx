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
