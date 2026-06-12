import { render, screen, fireEvent, within } from '@testing-library/react';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { Swords, Map, BookOpen } from 'lucide-react';
import { LandingModeCubes } from '../LandingModeCubes';
import type { ModeCubeModel } from '@/lib/landing/modeMeta';

const model = (over: Partial<ModeCubeModel> & { key: string }): ModeCubeModel => ({
  title: over.key,
  href: `/en/${over.key}`,
  variant: 'cyan',
  Icon: BookOpen,
  role: 'normal',
  onClick: vi.fn(),
  ...over,
});

const renderCubes = (props: Partial<React.ComponentProps<typeof LandingModeCubes>> = {}) =>
  render(
    <LanguageProvider>
      <LandingModeCubes
        t={(k: string) => k}
        dailyNode={<div data-testid="daily-banner">daily</div>}
        models={props.models ?? [
          model({ key: 'arena', title: 'Arena', href: '/en/multiplayer', variant: 'pink', Icon: Swords, role: 'anchor', livePill: '1.2k playing' }),
          model({ key: 'practice', title: 'Practice', href: '/en/practice', variant: 'cyan', Icon: BookOpen }),
          model({ key: 'adventure', title: 'Adventure', href: '/en/adventure', variant: 'lime', Icon: Map, badge: 'NEW' }),
        ]}
        extras={props.extras ?? []}
        sectionLabel="Game modes"
        {...props}
      />
    </LanguageProvider>,
  );

describe('LandingModeCubes', () => {
  it('renders the daily banner node in the hero slot', () => {
    renderCubes();
    expect(screen.getByTestId('daily-banner')).toBeInTheDocument();
  });

  it('renders each model as a link to its mode route', () => {
    renderCubes();
    expect(screen.getByRole('link', { name: /Arena/i })).toHaveAttribute('href', '/en/multiplayer');
    expect(screen.getByRole('link', { name: /Practice/i })).toHaveAttribute('href', '/en/practice');
    expect(screen.getByRole('link', { name: /Adventure/i })).toHaveAttribute('href', '/en/adventure');
  });

  it('gives the anchor model the 2×2 hero cube treatment', () => {
    renderCubes();
    const anchor = screen.getByTestId('mode-cube-anchor');
    expect(within(anchor).getByText('Arena')).toBeInTheDocument();
    // live pill only on the anchor
    expect(within(anchor).getByText('1.2k playing')).toBeInTheDocument();
  });

  it('renders a badge when the model has one', () => {
    renderCubes();
    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('fires the model onClick on tap (analytics parity with control)', () => {
    const onClick = vi.fn();
    renderCubes({
      models: [model({ key: 'practice', title: 'Practice', href: '/en/practice', onClick })],
    });
    fireEvent.click(screen.getByRole('link', { name: /Practice/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows a lock affordance and blocks navigation for a locked model', () => {
    const onClick = vi.fn();
    renderCubes({
      models: [model({ key: 'arena', title: 'Arena', href: '/en/multiplayer', locked: true, lockedMessage: 'Offline', onClick })],
    });
    const link = screen.getByRole('link', { name: /Arena/i });
    expect(link).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('collapses extras into a <details> "more modes" that keeps every link in the DOM (SEO)', () => {
    renderCubes({
      models: [model({ key: 'arena', title: 'Arena', role: 'anchor' })],
      extras: [
        model({ key: 'wordVault', title: 'Word Vault', href: '/en/word-vault', badge: 'ADMIN' }),
      ],
      moreLabel: 'More modes',
    });
    // link present even while collapsed
    expect(screen.getByRole('link', { name: /Word Vault/i })).toHaveAttribute('href', '/en/word-vault');
    expect(screen.getByText('More modes')).toBeInTheDocument();
  });

  it('renders nothing extra when there are no extras (no empty <details>)', () => {
    renderCubes({ extras: [] });
    expect(screen.queryByTestId('landing-cubes-more')).not.toBeInTheDocument();
  });

  it('gives EVERY cube an idle "glance" sheen (not only the anchor)', () => {
    // models here have no genIcon — the sheen must no longer depend on art,
    // so the whole bento shimmers, not just the colour-drenched anchor.
    renderCubes();
    const sheens = screen.getAllByTestId('cube-sheen');
    // anchor + 2 rest = 3 cubes, one sheen each
    expect(sheens.length).toBe(3);
  });

  it('staggers the sheen per-cube so the grid shimmers organically (no synced strobe)', () => {
    renderCubes();
    const delays = screen.getAllByTestId('cube-sheen').map((s) => s.style.animationDelay);
    // distinct per-cube delays — not every cube sweeping on the same clock
    expect(new Set(delays).size).toBeGreaterThan(1);
  });
});
