'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ImprovementPanel from '@/components/results/ImprovementPanel';
import UnlockRevealOverlay from '@/components/avatar/reveal/UnlockRevealOverlay';
import ProfileEntryButton from '@/components/avatar/reveal/ProfileEntryButton';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { LevelUnlock } from '@/lib/avatar/unlocks';
import { applyUnlockToConfig } from '@/lib/avatar/revealTrigger';
import type { LevelUpData, XpGainedData } from '@/types/components';
import { FIXTURE_PLAYER_ID, fixtureConfigForLevel } from './fixtures';
import { PANEL } from './labShared';
import { fixtureReveal, parseRevealLabKnobs } from './revealLabFixtures';

// Track C (unlock reveal) owns this file. Renders the REAL production pieces:
// UnlockRevealOverlay, the results ImprovementPanel (chip + next hint) and the
// header profile entry, fed by fixtures. Knobs: see ./revealLabFixtures.
export function RevealView({ level }: { level: number }) {
  const [search, setSearch] = useState<string | null>(null);
  useEffect(() => { setSearch(window.location.search); }, []);
  if (search === null) return <div data-testid="avatar-lab-view-reveal" />;
  return <RevealLab level={level} search={search} />;
}

function RevealLab({ level, search }: { level: number; search: string }) {
  const { t } = useLanguage();
  const knobs = useMemo(() => parseRevealLabKnobs(search, level), [search, level]);
  const reveal = useMemo(() => fixtureReveal(level, knobs), [level, knobs]);
  const [config, setConfig] = useState<CustomAvatarConfig>(() => fixtureConfigForLevel(knobs.from));
  const [open, setOpen] = useState(knobs.open && reveal !== null);
  const [seen, setSeen] = useState(false);

  const xp: XpGainedData = {
    xpEarned: 140,
    xpBreakdown: { gameCompletion: 20, scoreXp: 100, winBonus: 20, achievementXp: 0 },
    newTotalXp: 0,
    newLevel: level,
  };
  const levelUp: LevelUpData | null = knobs.from < level
    ? { oldLevel: knobs.from, newLevel: level, levelsGained: level - knobs.from, newTitles: [] }
    : null;

  const onEquip = useCallback(async (u: LevelUnlock) => {
    await new Promise(r => setTimeout(r, 450));
    if (knobs.failEquip) return false;
    setConfig(c => applyUnlockToConfig(c, u));
    return true;
  }, [knobs.failEquip]);

  return (
    <div data-testid="avatar-lab-view-reveal" className="flex flex-col gap-4 max-w-md">
      <div className={`${PANEL} flex items-center justify-between gap-3`}>
        <span className="font-neo-display text-neo-white font-bold text-sm">
          {t('avatarLab.unlocksAtLevel', { level })}
        </span>
        <ProfileEntryButton
          href="#"
          label={t('revealUnlock.profileEntry')}
          avatarConfig={config}
          userId={FIXTURE_PLAYER_ID}
          level={level}
          hasNew={seen && !open}
        />
      </div>

      <ImprovementPanel xp={xp} levelUp={levelUp} streak={null} t={t} reducedMotion={knobs.staticMotion} />

      {!reveal && <p className="text-neo-white/70 text-sm">{t('avatarLab.noUnlocks')}</p>}
      {reveal && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="self-start px-5 py-2.5 bg-neo-lime text-neo-black font-bold rounded-neo border-3 border-black shadow-hard"
        >
          {t('avatarLab.views.reveal')}
        </button>
      )}

      {reveal && open && (
        <UnlockRevealOverlay
          key={reveal.key}
          reveal={reveal}
          config={config}
          isGuest={knobs.guest}
          onEquip={onEquip}
          onSignUp={() => setOpen(false)}
          onClose={() => setOpen(false)}
          onShown={() => setSeen(true)}
          reducedMotion={knobs.staticMotion}
        />
      )}
    </div>
  );
}
