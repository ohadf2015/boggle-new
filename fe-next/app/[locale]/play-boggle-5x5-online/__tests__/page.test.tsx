// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Page, { generateMetadata } from '../page';
import HubPage from '../../play-boggle-online-free/page';
import {
  DIFFICULTIES,
  MIN_WORD_LENGTH_OPTIONS,
  MAX_PLAYERS_PER_ROOM,
  ROOM_CODE_LENGTH,
} from '@/shared/constants/gameConstants';
import { BOARD_BY_DIFFICULTY } from '@/components/multiplayer/lobby/LobbySettingsSummary';

const params = (locale: string) => ({ params: Promise.resolve({ locale }) });
const CANONICAL = 'https://www.lexiclash.live/en/play-boggle-5x5-online';

async function renderPage(locale = 'en') {
  return render(await Page(params(locale))).container;
}

describe('/play-boggle-5x5-online', () => {
  it('indexes only the English URL and canonicalizes every locale to it', async () => {
    const en = await generateMetadata(params('en'));
    const he = await generateMetadata(params('he'));
    expect(en.robots).toEqual({ index: true, follow: true });
    expect(he.robots).toEqual({ index: false, follow: true });
    expect(en.alternates?.canonical).toBe(CANONICAL);
    expect(he.alternates?.canonical).toBe(CANONICAL);
    expect(String(en.title).length).toBeLessThanOrEqual(60);
  });

  it('ships FAQPage JSON-LD that matches the visible FAQ', async () => {
    const container = await renderPage();
    const ld = JSON.parse(container.querySelector('#ld-faq-boggle-5x5')!.textContent!);
    const visible = Array.from(container.querySelectorAll('details summary span:first-child')).map((s) => s.textContent);
    expect(ld['@type']).toBe('FAQPage');
    expect(ld.mainEntity.map((q: { name: string }) => q.name)).toEqual(visible);
  });

  it('sends the visitor into a multiplayer room', async () => {
    const hrefs = Array.from((await renderPage()).querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/en/multiplayer');
  });

  it('only promises what the game offers', async () => {
    const text = (await renderPage()).textContent ?? '';
    expect(DIFFICULTIES.EASY).toMatchObject({ rows: 5, cols: 5 });
    expect(BOARD_BY_DIFFICULTY.EASY).toBe('5×5');
    expect(MIN_WORD_LENGTH_OPTIONS.map((o) => o.value)).toEqual([2, 3, 4]);
    expect(text).toContain(`Up to ${MAX_PLAYERS_PER_ROOM} players`);
    expect(text).toContain(`${ROOM_CODE_LENGTH}-letter code`);
  });

  it('is linked from the Boggle hub page', async () => {
    const { container } = render(await HubPage(params('en')));
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/en/play-boggle-5x5-online');
  });
});
