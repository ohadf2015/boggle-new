import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordfallLogo } from '../WordfallLogo';

describe('WordfallLogo', () => {
  it('renders an accessible "Wordfall" image mark (glyph)', () => {
    render(<WordfallLogo />);
    expect(screen.getByRole('img', { name: 'Wordfall' })).toBeInTheDocument();
  });

  it('renders the wordmark with the brand name text', () => {
    render(<WordfallLogo variant="wordmark" />);
    expect(screen.getByTestId('wordfall-wordmark')).toHaveTextContent('Wordfall');
  });

  it('themes the mark with the provided color', () => {
    const { container } = render(<WordfallLogo color="#00FFFF" />);
    const filled = container.querySelector('rect[fill="#00FFFF"]');
    expect(filled).not.toBeNull();
  });
});
