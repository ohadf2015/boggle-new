import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PlayStoreCTA from '../PlayStoreCTA';
import { playStoreUrlWithReferrer } from '../../utils/androidApp';

describe('PlayStoreCTA', () => {
  it('links to the Play Store with the install referrer for its campaign + locale', () => {
    render(<PlayStoreCTA campaign="download-word-game-android" locale="en" label="GET IT ON" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute(
      'href',
      playStoreUrlWithReferrer('download-word-game-android', 'en'),
    );
  });

  it('opens in a new tab safely', () => {
    render(<PlayStoreCTA campaign="c" locale="en" label="GET IT ON" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders the localizable eyebrow label and the Google Play wordmark', () => {
    render(<PlayStoreCTA campaign="c" locale="he" label="הורידו מ-" />);
    expect(screen.getByText('הורידו מ-')).toBeInTheDocument();
    expect(screen.getByText('Google Play')).toBeInTheDocument();
  });

  it('renders the Play triangle as an SVG', () => {
    const { container } = render(<PlayStoreCTA campaign="c" locale="en" label="GET IT ON" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('has an accessible label for screen readers', () => {
    render(<PlayStoreCTA campaign="c" locale="en" label="GET IT ON" ariaLabel="Download LexiClash on Google Play" />);
    expect(screen.getByLabelText('Download LexiClash on Google Play')).toBeInTheDocument();
  });
});
