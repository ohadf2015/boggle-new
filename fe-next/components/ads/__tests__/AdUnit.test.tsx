import React from 'react';
import { render, screen } from '@testing-library/react';
import { AdUnit } from '../AdUnit';

// Mock useLanguage
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

// Mock isDevHost via module internals — we control hostname directly
const originalLocation = window.location;

function mockHostname(hostname: string) {
  Object.defineProperty(window, 'location', {
    value: { ...originalLocation, hostname },
    writable: true,
    configurable: true,
  });
}

describe('AdUnit', () => {
  let pushSpy: jest.Mock;

  beforeEach(() => {
    pushSpy = jest.fn();
    (window as any).adsbygoogle = [];
    // Patch push on the array to spy
    (window as any).adsbygoogle.push = pushSpy;
    mockHostname('lexiclash.com');
    // jsdom returns 0 for offsetWidth; stub it so tryPush succeeds
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(300);
  });

  afterEach(() => {
    delete (window as any).adsbygoogle;
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('renders <ins> tag with correct AdSense attributes on production hostname', () => {
    const { container } = render(<AdUnit adSlot="1234567890" />);

    const ins = container.querySelector('ins.adsbygoogle');
    expect(ins).toBeInTheDocument();
    expect(ins).toHaveAttribute('data-ad-client', 'ca-pub-1896836706464880');
    expect(ins).toHaveAttribute('data-ad-slot', '1234567890');
    expect(ins).toHaveAttribute('data-ad-format', 'auto');
    expect(ins).toHaveAttribute('data-full-width-responsive', 'true');
  });

  it('calls adsbygoogle.push after mount on production', () => {
    render(<AdUnit adSlot="1234567890" />);
    expect(pushSpy).toHaveBeenCalledWith({});
  });

  it('does NOT render on localhost', () => {
    mockHostname('localhost');
    const { container } = render(<AdUnit adSlot="1234567890" />);
    expect(container.querySelector('ins.adsbygoogle')).not.toBeInTheDocument();
  });

  it('applies fixed size when provided', () => {
    const { container } = render(
      <AdUnit adSlot="1234567890" width={300} height={250} />
    );

    const ins = container.querySelector('ins.adsbygoogle') as HTMLElement;
    expect(ins).toBeInTheDocument();
    expect(ins.style.width).toBe('300px');
    expect(ins.style.height).toBe('250px');
    expect(ins).not.toHaveAttribute('data-ad-format');
  });

  it('wraps in container with aria-label using t()', () => {
    render(<AdUnit adSlot="1234567890" />);

    const container = screen.getByRole('complementary');
    expect(container).toHaveAttribute('aria-label', 'ads.label');
  });

  it('accepts className prop', () => {
    render(<AdUnit adSlot="1234567890" className="my-custom-class" />);

    const container = screen.getByRole('complementary');
    expect(container).toHaveClass('my-custom-class');
  });
});
