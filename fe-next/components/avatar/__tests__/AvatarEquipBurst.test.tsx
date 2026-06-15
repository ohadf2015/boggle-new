import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarEquipBurst from '../AvatarEquipBurst';

describe('AvatarEquipBurst', () => {
  it('renders nothing when there is no burst', () => {
    const { container } = render(<AvatarEquipBurst burst={null} fireKey={0} />);
    expect(container.querySelector('.avatar-equip-burst')).toBeNull();
  });

  it('renders nothing for a zero-particle plan (free swap)', () => {
    const { container } = render(
      <AvatarEquipBurst burst={{ particles: 0, color: '#BFFF00', celebrate: false }} fireKey={1} />,
    );
    expect(container.querySelector('.avatar-equip-burst')).toBeNull();
  });

  it('sprays the planned number of particles', () => {
    const { container } = render(
      <AvatarEquipBurst burst={{ particles: 18, color: '#A855F7', celebrate: true }} fireKey={2} />,
    );
    expect(container.querySelectorAll('.aeb-p').length).toBe(18);
  });

  it('adds a celebration ring only when celebrate is true', () => {
    const { container, rerender } = render(
      <AvatarEquipBurst burst={{ particles: 12, color: '#00FFFF', celebrate: false }} fireKey={3} />,
    );
    expect(container.querySelector('.aeb-ring')).toBeNull();
    rerender(<AvatarEquipBurst burst={{ particles: 12, color: '#00FFFF', celebrate: true }} fireKey={4} />);
    expect(container.querySelector('.aeb-ring')).toBeTruthy();
  });
});
