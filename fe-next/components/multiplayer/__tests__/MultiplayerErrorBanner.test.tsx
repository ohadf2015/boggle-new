/**
 * @jest-environment jsdom
 *
 * Tests for MultiplayerErrorBanner component
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiplayerErrorBanner } from '../MultiplayerErrorBanner';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    locale: 'en',
  }),
}));

jest.mock('framer-motion', () => {
  const proxy = new Proxy({}, {
    get: (_target, prop) => {
      const Component = React.forwardRef(function MotionMock(props: Record<string, unknown>, ref: React.Ref<HTMLElement>) {
        const { initial, animate, exit, transition, ...rest } = props;
        const Tag = prop as unknown as React.ElementType;
        return React.createElement(Tag, { ...rest, ref });
      });
      return Component;
    },
  });
  return {
    motion: proxy,
    AnimatePresence: function AnimatePresenceMock({ children }: { children: React.ReactNode }) { return <>{children}</>; },
  };
});

describe('MultiplayerErrorBanner', () => {
  it('should not render when error is null', () => {
    const { container } = render(
      <MultiplayerErrorBanner error={null} onDismiss={jest.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should render room-full error with correct i18n key', () => {
    render(
      <MultiplayerErrorBanner error="room-full" onDismiss={jest.fn()} />
    );
    expect(screen.getByText('multiplayerFlow.errors.roomFull')).toBeInTheDocument();
  });

  it('should render connection-lost error with retry button', () => {
    const onRetry = jest.fn();
    render(
      <MultiplayerErrorBanner error="connection-lost" onDismiss={jest.fn()} onRetry={onRetry} />
    );
    expect(screen.getByText('multiplayerFlow.errors.connectionLost')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /common.retry/i });
    expect(retryBtn).toBeInTheDocument();
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should render host-left error', () => {
    render(
      <MultiplayerErrorBanner error="host-left" onDismiss={jest.fn()} />
    );
    expect(screen.getByText('multiplayerFlow.errors.hostLeft')).toBeInTheDocument();
  });

  it('should render invalid-code error', () => {
    render(
      <MultiplayerErrorBanner error="invalid-code" onDismiss={jest.fn()} />
    );
    expect(screen.getByText('multiplayerFlow.errors.invalidCode')).toBeInTheDocument();
  });

  it('should render room-closed error', () => {
    render(
      <MultiplayerErrorBanner error="room-closed" onDismiss={jest.fn()} />
    );
    expect(screen.getByText('multiplayerFlow.errors.roomClosed')).toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <MultiplayerErrorBanner error="room-full" onDismiss={onDismiss} />
    );
    const dismissBtn = screen.getByLabelText('common.dismiss');
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should have role="alert" for screen reader announcement', () => {
    render(
      <MultiplayerErrorBanner error="room-full" onDismiss={jest.fn()} />
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
