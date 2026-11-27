import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k), language: 'en' }),
}));
const sfx = new Proxy({}, { get: () => vi.fn() });
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => sfx }));
vi.mock('@/hooks/usePrefersReducedMotion', () => ({ usePrefersReducedMotion: () => false }));
vi.mock('@/hooks/useHoliday', () => ({ useHoliday: () => ({ holiday: 'hanukkah', resolved: true, region: 'IL' }) }));
vi.mock('@/hooks/fastValidateWord', () => ({ fastValidateWord: vi.fn(async () => true) }));
vi.mock('@/lib/holidays/holidayClient', () => ({ noticeHolidayWord: vi.fn() }));

import ArcadeShell from '../ArcadeShell';
import OilGame from '../oil/OilGame';
import SleighGame from '../sleigh/SleighGame';
import SnowballGame from '../snowball/SnowballGame';
import WrapGame from '../wrap/WrapGame';
import DreidelGame from '../dreidel/DreidelGame';
import StackGame from '../stack/StackGame';
import { buildContent } from '@/lib/holidays/arcade/content.server';
import type { ArcadeGameId } from '@/lib/holidays/arcade/games';

const never = () => false;
const GAMES = { oil: OilGame, sleigh: SleighGame, snowball: SnowballGame, wrap: WrapGame, dreidel: DreidelGame, sufganiyah: StackGame } as const;

async function mount(game: ArcadeGameId, lang = 'en') {
  const content = await buildContent(game, lang, 11, never);
  const onScore = vi.fn();
  const onEnd = vi.fn();
  const Game = GAMES[game] as React.ComponentType<{ content: unknown; lang: string; onScore: (n: number) => void; onEnd: (e: unknown) => void }>;
  render(
    <ArcadeShell holiday={game === 'oil' || game === 'dreidel' || game === 'sufganiyah' ? 'hanukkah' : 'christmas'} game={game} score={0} onExit={vi.fn()}>
      <Game content={content} lang={lang} onScore={onScore} onEnd={onEnd} />
    </ArcadeShell>,
  );
  return { content, onScore, onEnd };
}

beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
});

describe('arcade games render', () => {
  it('Given Sufganiyah Stack, then the next-letter marker is positioned by an absolute wrapper the letter style cannot override', async () => {
    await mount('sufganiyah');
    const marker = screen.getByTestId('stack-next');
    expect(marker.className).toContain('absolute');
    expect(marker.firstElementChild?.className).not.toContain('absolute');
  });

  it('Given Snowball Fight over its painted scene, then no flat snow bar is drawn across the field', async () => {
    await mount('snowball');
    const field = screen.getByTestId('arcade-snowball').querySelector('[data-arcade-stage]')!;
    expect(field.querySelector('[class*="ground"]')).toBeNull();
  });

  it.each(Object.keys(GAMES) as ArcadeGameId[])('Given %s content, then the game mounts inside the shell', async (game) => {
    await mount(game);
    expect(screen.getByTestId(`arcade-${game}`)).toBeInTheDocument();
  });

  it.each(Object.keys(GAMES) as ArcadeGameId[])('Given %s on a tall phone, then shell, stage and game root all grow to fill the height', async (game) => {
    await mount(game);
    const root = screen.getByTestId(`arcade-${game}`);
    const stage = root.querySelector('[data-arcade-stage]') as HTMLElement;
    for (const el of [root, stage, stage.firstElementChild as HTMLElement]) {
      expect(el.className).toContain('flex-[1_0_auto]');
      expect(el.className).not.toMatch(/\bmin-h-full\b/);
    }
    expect(stage.className).toContain('flex-col');
  });

  it('Given night 1 of Oil, then the shamash and the first candle are lit', async () => {
    await mount('oil');
    expect(screen.getByRole('img', { name: /candlesLit/ }).getAttribute('aria-label')).toContain('"count":1');
    const lit = document.querySelectorAll('[data-slot][data-lit="true"]');
    expect([...lit].map((el) => el.getAttribute('data-slot')).sort()).toEqual(['0', 'shamash']);
  });

  it('Given a phone, then rack letters and the send button are thumb-sized (56px)', async () => {
    const { content } = await mount('oil');
    const tile = screen.getAllByRole('button', { pressed: false }).find((b) => b.textContent === content.rack[0])!;
    expect(tile.className).toContain('size-14');
    expect(screen.getByText('holiday.arcade.submit').closest('button')!.className).toContain('h-14');
  });

  it('Given an oil rack, when a word is typed and sent, then it scores', async () => {
    const { content, onScore } = await mount('oil');
    for (const l of content.rack.slice(0, 3)) fireEvent.keyDown(window, { key: l.toLowerCase() });
    await act(async () => {
      fireEvent.keyDown(window, { key: 'Enter' });
    });
    expect(onScore).toHaveBeenCalledWith(expect.any(Number));
    expect(Math.max(...onScore.mock.calls.map((c) => c[0] as number))).toBeGreaterThan(0);
  });

  it('Given doughnut taps without a drag, then nothing is sent until the player presses go', async () => {
    const { fastValidateWord } = await import('@/hooks/fastValidateWord');
    vi.mocked(fastValidateWord).mockClear();
    await mount('sufganiyah');
    const tray = screen.getByRole('group');
    const cells = ['0', '1', '2'].map((c) => tray.querySelector(`[data-c="${c}"][data-r="0"]`) as HTMLElement);
    for (const el of cells) {
      fireEvent.pointerDown(el);
      fireEvent.pointerUp(el);
    }
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(3);
    expect(fastValidateWord).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(screen.getByLabelText('holiday.arcade.submit'));
    });
    expect(fastValidateWord).toHaveBeenCalledTimes(1);
  });

  it('Given a Hebrew sleigh round, then the rack shows Hebrew letters', async () => {
    const { content } = await mount('sleigh', 'he');
    expect(screen.getAllByRole('button', { pressed: false }).some((b) => b.textContent === content.chimneys[0][0])).toBe(true);
  });

  it('Given a snowball, when caught, then the next ball arrives', async () => {
    const { content } = await mount('snowball');
    expect(screen.getByText(content.balls[0].text)).toBeInTheDocument();
    fireEvent.click(screen.getByText('holiday.arcade.snowball.catch'));
    expect(screen.getAllByText(content.balls[1].text).length).toBeGreaterThan(0);
  });
});
