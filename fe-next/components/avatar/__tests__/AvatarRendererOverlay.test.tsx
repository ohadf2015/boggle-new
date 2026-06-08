import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { getSeededAvatarConfig } from '@/shared/types/customAvatar';

const config = getSeededAvatarConfig(7);

describe('AvatarRenderer — reaction overlay badge', () => {
  it('renders no overlay by default', () => {
    const { container } = render(<AvatarRenderer config={config} disableEffects />);
    expect(container.querySelector('[data-overlay]')).toBeNull();
  });

  it('renders an "alert" overlay badge when overlay="alert"', () => {
    const { container } = render(
      <AvatarRenderer config={config} overlay="alert" disableEffects />,
    );
    const badge = container.querySelector('[data-overlay]');
    expect(badge).not.toBeNull();
    expect(badge?.getAttribute('data-overlay')).toBe('alert');
  });

  it('renders a "flame" overlay badge when overlay="flame"', () => {
    const { container } = render(
      <AvatarRenderer config={config} overlay="flame" disableEffects />,
    );
    expect(container.querySelector('[data-overlay]')?.getAttribute('data-overlay')).toBe('flame');
  });
});
