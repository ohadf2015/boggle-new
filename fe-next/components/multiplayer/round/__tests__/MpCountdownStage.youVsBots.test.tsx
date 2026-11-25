import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/gameState/selectors', () => ({ useGameMode: () => 'classic' }));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => true }));
vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playCountdownBeep: vi.fn() }) }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => true }));
vi.mock('@/components/Avatar', () => ({ default: () => <i /> }));
const { lang } = vi.hoisted(() => ({ lang: { value: 'en' } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: lang.value }) }));

import { MpCountdownStage, __resetCountdownDupGuard } from '../MpCountdownStage';
import { ru } from '@/translations/ru.js';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${JSON.stringify(p)}` : k);
const me = { username: 'Ann' };
const bots = [{ username: 'Bot A', isBot: true }, { username: 'Bot B', isBot: true }, { username: 'Bot C', isBot: true }];

describe('MpCountdownStage: one human against bots', () => {
  beforeEach(() => { __resetCountdownDupGuard(); lang.value = 'en'; });

  it('reads naturally in Russian for the default three bots', () => {
    lang.value = 'ru';
    const round = (ru as unknown as { mpUi: { round: Record<string, string> } }).mpUi.round;
    const tRu = (k: string, p?: Record<string, string | number>) =>
      (round[k.replace('mpUi.round.', '')] ?? k).replace('{count}', String(p?.count ?? ''));
    render(<MpCountdownStage t={tRu} players={[me, ...bots]} />);
    expect(screen.getByTestId('mp-countdown-vs-bots')).toHaveTextContent('Ты против 3 ботов');
  });

  it('says "You vs 3 bots" so a bot round is never a surprise', () => {
    render(<MpCountdownStage t={t} players={[me, ...bots]} />);
    expect(screen.getByTestId('mp-countdown-vs-bots')).toHaveTextContent('mpUi.round.youVsBots_other:{"count":3}');
  });

  it('keeps "Get ready" when another human is in the round', () => {
    render(<MpCountdownStage t={t} players={[me, { username: 'Bob' }, ...bots]} />);
    expect(screen.queryByTestId('mp-countdown-vs-bots')).not.toBeInTheDocument();
    expect(screen.getByText('mpUi.round.getReady')).toBeInTheDocument();
  });

  it('never labels a classroom round', () => {
    render(<MpCountdownStage t={t} players={[me, ...bots]} classroom={{ mode: 'classic' }} />);
    expect(screen.queryByTestId('mp-countdown-vs-bots')).not.toBeInTheDocument();
  });
});
