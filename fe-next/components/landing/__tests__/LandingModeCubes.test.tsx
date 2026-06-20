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

  it('hub layout: shows a VISIBLE section header + a compacted live-online pill', () => {
    renderCubes({ layout: 'hub', liveCount: 1240 });
    // section label is a visible heading in hub mode (aria-label-only in bento)
    expect(screen.getByRole('heading', { name: /Game modes/i })).toBeInTheDocument();
    // header live pill compacts 1240 → "1.2k" (distinct from the anchor's livePill)
    expect(screen.getByText(/1\.2k landing\.home\.online/)).toBeInTheDocument();
  });

  it('hub layout: hides the live pill when the count is zero', () => {
    renderCubes({ layout: 'hub', liveCount: 0 });
    expect(screen.getByRole('heading', { name: /Game modes/i })).toBeInTheDocument();
    expect(screen.queryByText(/online/i)).toBeNull();
  });

  it('bento layout (default): section label stays an invisible aria-label, no heading', () => {
    renderCubes();
    expect(screen.queryByRole('heading', { name: /Game modes/i })).toBeNull();
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

  it('reserves the idle "glance" sheen for RECOMMENDED modes only (less on-screen glare)', () => {
    // default set: arena (anchor) + practice + adventure. Only the anchor is
    // "recommended" here, so only it shimmers — the calm modes stay glare-free.
    renderCubes();
    const sheens = screen.getAllByTestId('cube-sheen');
    expect(sheens.length).toBe(1);
    // and it's the anchor that carries it
    const anchor = screen.getByTestId('mode-cube-anchor');
    expect(within(anchor).queryByTestId('cube-sheen')).toBeInTheDocument();
  });

  it('also shimmers high-energy modes (blast) but never the calm ones (practice)', () => {
    renderCubes({
      models: [
        model({ key: 'arena', title: 'Arena', variant: 'pink', role: 'anchor' }),
        model({ key: 'blast', title: 'Blast', variant: 'orange' }),
        model({ key: 'practice', title: 'Practice', variant: 'cyan' }),
      ],
    });
    // arena (anchor) + blast = 2 recommended sheens; practice has none
    expect(screen.getAllByTestId('cube-sheen').length).toBe(2);
    const practice = screen.getByRole('link', { name: /Practice/i });
    expect(within(practice).queryByTestId('cube-sheen')).not.toBeInTheDocument();
  });

  it('staggers the sheen per-cube so the recommended set shimmers organically (no synced strobe)', () => {
    renderCubes({
      models: [
        model({ key: 'arena', title: 'Arena', variant: 'pink', role: 'anchor' }),
        model({ key: 'blast', title: 'Blast', variant: 'orange' }),
      ],
    });
    const delays = screen.getAllByTestId('cube-sheen').map((s) => s.style.animationDelay);
    // distinct per-cube delays — not every cube sweeping on the same clock
    expect(new Set(delays).size).toBeGreaterThan(1);
  });

  // matches a BARE colored hard-shadow token (the resting tile shadow), ignoring
  // prefixed variants like `group-hover:shadow-hard-pink` or `active:shadow-hard-pressed`.
  const restingShadow = (el: HTMLElement) =>
    el.className.match(/(?:^|\s)(shadow-hard-(?:pink|cyan|lime|purple|orange|blue))(?=\s|$)/)?.[1];

  it('drops the loud 3px black frame AND the floating neon offset shadow at rest', () => {
    renderCubes();
    const arena = screen.getByTestId('mode-cube-anchor');
    // the hard black neo frame is gone — it boxed the full-bleed mascot art
    expect(arena.className).not.toMatch(/(?:^|\s)border-neo-thick(?=\s|$)/);
    expect(arena.className).not.toMatch(/(?:^|\s)border-black(?=\s|$)/);
    // and the detached coloured offset slab is gone at rest (read as a neon bar
    // once the frame was removed) — no bare `shadow-hard-*` resting on the tile
    expect(restingShadow(arena)).toBeUndefined();
    expect(arena.className).not.toMatch(/(?:^|\s)shadow-hard(?=\s|$)/);
  });

  it('color-codes each cube by folding the hue INTO a contained hard border (no slab, no blur)', () => {
    renderCubes({
      models: [
        model({ key: 'arena', title: 'Arena', variant: 'pink', role: 'anchor' }),
        model({ key: 'practice', title: 'Practice', variant: 'cyan' }),
        model({ key: 'blast', title: 'Blast', variant: 'orange' }),
      ],
    });
    const arena = screen.getByRole('link', { name: /Arena/i });
    const practice = screen.getByRole('link', { name: /Practice/i });
    const blast = screen.getByRole('link', { name: /Blast/i });

    // a 2px mode-tinted hard border IS the colour-coding now (contained, not floating)
    expect(arena.className).toMatch(/border-2/);
    expect(arena.className).toMatch(/border-neo-pink/);
    expect(practice.className).toMatch(/border-neo-cyan/);
    expect(blast.className).toMatch(/border-neo-orange/);
    // the per-mode hue still carries on HOVER (interaction feedback stays brutalist)
    expect(arena.className).toMatch(/group-hover:shadow-hard-pink/);
    // but never as a resting offset slab
    expect(restingShadow(arena)).toBeUndefined();
  });

  // ---- art framing: mascots fill the tile (the homepage "images take the width") ----

  const artModels = [
    model({ key: 'arena', title: 'Arena', variant: 'pink', role: 'anchor', genIcon: '/modes/cubes/arena.png' }),
    model({ key: 'connections', title: 'Connections', variant: 'blue', genIcon: '/modes/cubes/connections.png', imgScale: 1.6 }),
    model({ key: 'blast', title: 'Blast', variant: 'orange', genIcon: '/modes/cubes/blast.png' }),
  ];

  it('lets the anchor art fill the whole tile (object-cover, no letterbox bars)', () => {
    const { container } = renderCubes({ models: artModels });
    const anchor = screen.getByTestId('mode-cube-anchor');
    const img = anchor.querySelector('img');
    expect(img, 'anchor renders its art').toBeTruthy();
    // cover fills the non-square (16/9) phone anchor edge-to-edge; contain would
    // letterbox the square mascot onto navy side-bars (the bug we are fixing).
    expect(img!.className).toMatch(/object-cover/);
    expect(img!.className).not.toMatch(/object-contain/);
    void container;
  });

  it('scales up a small-framed mascot so it fills its cube', () => {
    renderCubes({ models: artModels });
    const conn = screen.getByRole('link', { name: /Connections/i });
    // the per-asset scale is exposed as a CSS var the image consumes
    expect(conn.style.getPropertyValue('--cube-img-scale')).toBe('1.6');
    const img = conn.querySelector('img');
    expect(img!.className).toMatch(/scale-\[var\(--cube-img-scale\)\]/);
  });

  it('defaults edge-bleeding art to scale 1 (no clipping of FX)', () => {
    renderCubes({ models: artModels });
    const blast = screen.getByRole('link', { name: /Blast/i });
    expect(blast.style.getPropertyValue('--cube-img-scale')).toBe('1');
  });

  it('tints each art cube with its own mode-hue glow over the dead navy', () => {
    renderCubes({ models: artModels });
    const glows = screen.getAllByTestId('cube-glow');
    // one per art cube (anchor + 2) — fills empty navy with mode colour
    expect(glows.length).toBe(3);
  });

  it('does NOT add a glow to icon-fallback cubes (no art behind it to tint)', () => {
    renderCubes(); // default models have no genIcon
    expect(screen.queryByTestId('cube-glow')).not.toBeInTheDocument();
  });
});
