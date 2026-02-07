import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestCard, QuestCardProps } from '../QuestCard';
import { LanguageProvider } from '@/contexts/LanguageContext';

jest.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: jest.fn(),
      onMouseLeave: jest.fn(),
      onMouseMove: jest.fn(),
      onTouchStart: jest.fn(),
      onTouchMove: jest.fn(),
      onTouchEnd: jest.fn(),
    },
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: false,
    prefersReducedMotion: true,
    isLowEnd: false,
  }),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<'div'>) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.ComponentProps<'span'>) => <span {...props}>{children}</span>,
    path: (props: React.SVGProps<SVGPathElement>) => <path {...props} />,
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LanguageProvider initialLanguage="en">{ui}</LanguageProvider>
  );
}

const defaultProps: QuestCardProps = {
  challengeId: 'wordHunt',
  icon: <span>icon</span>,
  title: 'Word Hunt',
  tagline: 'Find words before time runs out!',
  color: 'orange',
  status: 'new',
  onPlay: jest.fn(),
  buttonText: 'START QUEST',
  timeMode: 'timed',
  timeModeLabel: 'Timed Quest',
};

describe('QuestCard', () => {
  test('renders title and tagline', () => {
    renderWithProviders(<QuestCard {...defaultProps} />);

    expect(screen.getByText('Word Hunt')).toBeInTheDocument();
    expect(screen.getByText('Find words before time runs out!')).toBeInTheDocument();
  });

  test('renders time mode badge', () => {
    renderWithProviders(<QuestCard {...defaultProps} />);

    expect(screen.getByText('Timed Quest')).toBeInTheDocument();
  });

  test('renders button text', () => {
    renderWithProviders(<QuestCard {...defaultProps} />);

    expect(screen.getByText('START QUEST')).toBeInTheDocument();
  });

  test('calls onPlay when clicked', () => {
    const onPlay = jest.fn();
    renderWithProviders(<QuestCard {...defaultProps} onPlay={onPlay} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  test('shows won badge when status is won', () => {
    renderWithProviders(
      <QuestCard {...defaultProps} status="won" isLoadingStatus={false} />
    );

    expect(screen.getByTestId('won-badge')).toBeInTheDocument();
  });

  test('shows lost badge when status is lost', () => {
    renderWithProviders(
      <QuestCard {...defaultProps} status="lost" isLoadingStatus={false} />
    );

    expect(screen.getByTestId('lost-badge')).toBeInTheDocument();
  });

  test('renders with quest-card test id', () => {
    renderWithProviders(<QuestCard {...defaultProps} />);

    expect(screen.getByTestId('quest-card-wordHunt')).toBeInTheDocument();
  });

  test('handles unavailable status with request button', () => {
    const onRequest = jest.fn();
    renderWithProviders(
      <QuestCard
        {...defaultProps}
        challengeId="buzz"
        status="unavailable"
        onRequestChallenge={onRequest}
        requestState="idle"
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  test('does not show loading opacity when status is new', () => {
    const { container } = renderWithProviders(<QuestCard {...defaultProps} />);

    const card = container.querySelector('[role="button"]');
    expect(card).not.toHaveClass('opacity-50');
  });

  test('renders icon in circular container', () => {
    renderWithProviders(<QuestCard {...defaultProps} />);

    expect(screen.getByText('icon')).toBeInTheDocument();
  });

  test('renders badge when provided', () => {
    renderWithProviders(
      <QuestCard {...defaultProps} challengeId="buzz" color="yellow" badge="BETA" />
    );

    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});
