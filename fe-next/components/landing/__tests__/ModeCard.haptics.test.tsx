import { render, screen, fireEvent } from '@testing-library/react';
import ModeCard from '../ModeCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Swords } from 'lucide-react';

const tap = vi.fn();
vi.mock('@/utils/haptics', () => ({
  haptics: { tap: () => tap() },
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn() },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: true }),
}));

describe('ModeCard haptics', () => {
  const baseProps = {
    title: 'Arena',
    description: 'Real-time multiplayer',
    href: '/multiplayer',
    icon: <Swords data-testid="i" />,
    variant: 'pink' as const,
  };

  beforeEach(() => tap.mockClear());

  it('fires haptics.tap on Link click', () => {
    const onClick = vi.fn();
    render(
      <LanguageProvider>
        <ModeCard {...baseProps} onClick={onClick} />
      </LanguageProvider>
    );
    const link = screen.getByRole('link');
    fireEvent.click(link);
    expect(tap).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('fires haptics.tap on locked button click', () => {
    const onLockedClick = vi.fn();
    render(
      <LanguageProvider>
        <ModeCard
          {...baseProps}
          locked
          lockedMessage="Sign in to play"
          onLockedClick={onLockedClick}
        />
      </LanguageProvider>
    );
    const btn = screen.getByRole('button');
    fireEvent.click(btn);
    expect(tap).toHaveBeenCalledTimes(1);
    expect(onLockedClick).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire haptics while loading', () => {
    render(
      <LanguageProvider>
        <ModeCard {...baseProps} loading />
      </LanguageProvider>
    );
    const card = screen.getByLabelText(/Loading/);
    fireEvent.click(card);
    expect(tap).not.toHaveBeenCalled();
  });
});
