'use client';

/** The in-level strip for the current level kind (hunt tray, chain letter, fog/bomb status). */
import { memo } from 'react';
import { CloudFog, Bomb } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { PlayLevel } from '@/lib/adventure/play/levels';
import HuntTray from './HuntTray';
import ChainPrompt from './ChainPrompt';
import type { BombState } from './rules';

interface Props {
  lvl: PlayLevel;
  language: string;
  targets?: readonly string[];
  targetsFound: readonly string[];
  chainLetter: string | null;
  chainLinks: number;
  chainBrokenAt: number | null;
  bombs: BombState | null;
  fogThinning: boolean;
}

function VariantPanel({ lvl, language, targets, targetsFound, chainLetter, chainLinks, chainBrokenAt, bombs, fogThinning }: Props) {
  const { t } = useLanguageSafe();
  if (lvl.kind === 'hunt' && targets?.length) {
    return <HuntTray targets={targets} found={targetsFound} need={lvl.huntCount ?? targets.length} language={language} />;
  }
  if (lvl.kind === 'chain') return <ChainPrompt letter={chainLetter} brokenAt={chainBrokenAt} links={chainLinks} />;
  if (lvl.kind === 'fog' || lvl.kind === 'bomb') {
    const Icon = lvl.kind === 'fog' ? CloudFog : Bomb;
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border-[3px] border-black bg-[#1a1a2e]/95 px-3 py-1.5 shadow-[3px_3px_0_#000]"
        data-testid={`${lvl.kind}-strip`} aria-live="polite">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border-[3px] border-black text-black ${lvl.kind === 'fog' ? 'bg-neo-purple' : 'bg-neo-orange'}`}>
          <Icon className="h-5 w-5" strokeWidth={2.75} />
        </span>
        <span className="min-w-0 flex-1 font-neo-display text-sm font-bold leading-tight">
          {lvl.kind === 'fog'
            ? (fogThinning ? t('adventurePlay.variety.fogThinning') : t('adventurePlay.variety.fogHelp'))
            : t('adventurePlay.variety.bombHelp')}
        </span>
        {lvl.kind === 'bomb' && bombs && (
          <span className="shrink-0 rounded-md border-2 border-black bg-neo-lime px-1.5 font-neo-display font-bold tabular-nums text-black">
            {t('adventurePlay.variety.bombDefusedCount', { count: bombs.defusedCount })}
          </span>
        )}
      </div>
    );
  }
  return null;
}

export default memo(VariantPanel);
