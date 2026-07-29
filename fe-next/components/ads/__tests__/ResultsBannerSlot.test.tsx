import React from 'react';
import { render, screen } from '@testing-library/react';
import ResultsBannerSlot from '../ResultsBannerSlot';

const inlineBannerMock = vi.fn();

vi.mock('../InlineBannerAd', () => ({
  default: (props: Record<string, unknown>) => {
    inlineBannerMock(props);
    return <div data-testid="inline-banner-mock" data-props={JSON.stringify(props)} />;
  },
}));

describe('ResultsBannerSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders InlineBannerAd with content variant + post-game zone', () => {
    render(<ResultsBannerSlot placement="singleplayer-complete" />);
    expect(inlineBannerMock).toHaveBeenCalled();
    const props = inlineBannerMock.mock.calls[0][0];
    expect(props.variant).toBe('content');
    expect(props.webZone).toBe('post-game');
  });

  it('forwards reservedHeight prop', () => {
    render(<ResultsBannerSlot placement="daily-complete" reservedHeight={72} />);
    const props = inlineBannerMock.mock.calls[0][0];
    expect(props.reservedHeight).toBe(72);
  });

  it('exposes data-results-banner attribute carrying placement (analytics anchor)', () => {
    const { container } = render(<ResultsBannerSlot placement="league-complete" />);
    const wrapper = container.querySelector('[data-results-banner]') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-results-banner')).toBe('league-complete');
  });

  it('applies optional className on the wrapper', () => {
    const { container } = render(
      <ResultsBannerSlot placement="word-hunt-complete" className="my-6" />,
    );
    const wrapper = container.querySelector('[data-results-banner]') as HTMLElement;
    expect(wrapper).toHaveClass('my-6');
  });

  it('renders nothing visible when disabled prop is true (UX kill switch)', () => {
    const { container } = render(
      <ResultsBannerSlot placement="challenge-complete" disabled />,
    );
    expect(screen.queryByTestId('inline-banner-mock')).toBeNull();
    expect(container.firstChild).toBeNull();
  });
});
