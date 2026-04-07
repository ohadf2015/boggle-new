import { render, screen } from '@testing-library/react';
import MechanicIndicator from '../MechanicIndicator';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => (
      <div role={props.role} className={props.className} data-testid={props['data-testid']}>
        {children}
      </div>
    ),
    span: ({ children, ...props }: any) => <span className={props.className}>{children}</span>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Sparkles: ({ className }: any) => <span data-testid="sparkles-icon" className={className} />,
  Zap: ({ className }: any) => <span data-testid="zap-icon" className={className} />,
}));

describe('MechanicIndicator', () => {
  it('renders nothing when mechanic is null (World 1)', () => {
    const { container } = render(
      <MechanicIndicator mechanic={null} hitCount={0} worldNumber={1} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders mechanic name via translation key', () => {
    render(
      <MechanicIndicator mechanic="synonymPairs" hitCount={0} worldNumber={2} />
    );
    expect(screen.getByText('adventure.mechanic.synonymPairs')).toBeInTheDocument();
  });

  it('shows hit count when greater than 0', () => {
    render(
      <MechanicIndicator mechanic="etymologyRoots" hitCount={1} worldNumber={3} />
    );
    expect(screen.getByText('×1')).toBeInTheDocument();
  });

  it('shows STREAK label when hitCount >= 2', () => {
    render(
      <MechanicIndicator mechanic="etymologyRoots" hitCount={3} worldNumber={3} />
    );
    expect(screen.getByText('×3 STREAK')).toBeInTheDocument();
  });

  it('does not show hit count when 0', () => {
    render(
      <MechanicIndicator mechanic="palindromes" hitCount={0} worldNumber={7} />
    );
    expect(screen.queryByText('×0')).not.toBeInTheDocument();
  });

  it('shows mechanic hint description', () => {
    render(
      <MechanicIndicator mechanic="anagrams" hitCount={0} worldNumber={6} />
    );
    expect(screen.getByText('adventure.mechanics.anagrams')).toBeInTheDocument();
  });
});
