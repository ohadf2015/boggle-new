import { render } from '@testing-library/react';
import ModeCard from '../ModeCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Users } from 'lucide-react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock hooks
vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({
    ref: { current: null },
    style: {},
    handlers: {
      onMouseEnter: vi.fn(),
      onMouseLeave: vi.fn(),
      onMouseMove: vi.fn(),
    },
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

describe('ModeCard Texture', () => {
  const defaultProps = {
    title: 'Test Mode',
    description: 'Test Description',
    href: '/test',
    icon: <Users />,
    variant: 'cyan' as const,
  };

  it('should NOT apply texture-halftone-comic-light class (texture removed)', () => {
    const { container } = render(
      <LanguageProvider>
        <ModeCard {...defaultProps} />
      </LanguageProvider>
    );

    const cardElement = container.querySelector('.texture-halftone-comic-light');
    expect(cardElement).toBeNull();
  });

  it('should render without texture overlay classes', () => {
    const { container } = render(
      <LanguageProvider>
        <ModeCard {...defaultProps} />
      </LanguageProvider>
    );

    const cardDiv = container.querySelector('[class*="texture-halftone"]');
    expect(cardDiv).toBeNull();
  });
});
