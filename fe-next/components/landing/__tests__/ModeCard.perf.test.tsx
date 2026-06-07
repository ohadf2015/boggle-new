/* eslint-disable @next/next/no-img-element -- next/image is mocked to a plain <img> to inspect the forwarded priority prop */
import { render } from '@testing-library/react';
import ModeCard from '../ModeCard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Users } from 'lucide-react';

// framer-motion mock — spread motion props onto a plain element so the inner
// <Image> renders normally and we can inspect its attributes.
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/hooks/useTiltEffect', () => ({
  useTiltEffect: () => ({ ref: { current: null }, style: {}, handlers: { onMouseEnter: vi.fn(), onMouseLeave: vi.fn(), onMouseMove: vi.fn() } }),
}));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ enableComplexAnimations: false, prefersReducedMotion: true }),
}));

// Reflect next/image's `priority` prop into a data attribute so we can assert
// our forwarding contract independent of Next's (version-specific) <img> output.
vi.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, alt, src }: { priority?: boolean; alt?: string; src?: string }) => (
    <img alt={alt} data-priority={priority ? 'true' : 'false'} src={typeof src === 'string' ? src : ''} />
  ),
}));

const base = {
  title: 'Practice',
  description: 'Solo play',
  href: '/practice',
  icon: <Users data-testid="icon" />,
  variant: 'cyan' as const,
  modeImage: '/modes/practice.png',
};

function renderCard(props: Record<string, unknown>) {
  const { container } = render(
    <LanguageProvider>
      <ModeCard {...base} {...props} />
    </LanguageProvider>
  );
  return container.querySelector('img');
}

describe('ModeCard LCP priority', () => {
  it('eager-loads the mode image at high priority when priority is set (above-the-fold LCP card)', () => {
    const img = renderCard({ priority: true });
    expect(img).not.toBeNull();
    expect(img?.getAttribute('data-priority')).toBe('true');
  });

  it('does not prioritize the mode image by default (below-the-fold cards)', () => {
    const img = renderCard({});
    expect(img).not.toBeNull();
    expect(img?.getAttribute('data-priority')).toBe('false');
  });
});
