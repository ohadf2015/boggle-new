import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AvatarEmoteBubble } from '../AvatarEmoteBubble';

describe('AvatarEmoteBubble', () => {
  it('renders nothing when there is no active emote', () => {
    const { container } = render(<AvatarEmoteBubble active={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the emoji for the active emote', () => {
    render(<AvatarEmoteBubble active={{ emote: 'emoteAngry', nonce: 1 }} />);
    expect(screen.getByText('😠')).toBeInTheDocument();
  });

  it('is decorative (aria-hidden) so screen readers do not announce raw emoji', () => {
    const { container } = render(
      <AvatarEmoteBubble active={{ emote: 'emoteLove', nonce: 1 }} />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });
});
