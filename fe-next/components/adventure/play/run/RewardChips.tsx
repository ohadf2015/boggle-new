'use client';

/** What came out of the chest: gold, potions, collection items — each pops in. */
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, ScrollText, Gem, Sparkles } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { getCollectibleById, type CollectibleCategory } from '@/lib/adventure/collectibleConfig';
import type { LevelLoot } from './runSummary';
import { COIN_ART, potionArt } from './art';

const CAT_ICON: Record<CollectibleCategory, typeof Trophy> = { trophy: Trophy, scroll: ScrollText, rune: Gem, relic: Sparkles };
const CAT_BG: Record<CollectibleCategory, string> = { trophy: 'bg-neo-yellow', scroll: 'bg-neo-cyan', rune: 'bg-neo-purple', relic: 'bg-neo-pink' };

export default function RewardChips({ loot, delay = 0 }: { loot: LevelLoot; delay?: number }) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const pop = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24, scale: 0.6 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: 'spring' as const, stiffness: 420, damping: 18, delay: delay + i * 0.12 },
  });
  let i = 0;
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label={t('adventurePlay.loot.chestTitle')}>
      {loot.gold > 0 && (
        <motion.li {...pop(i++)} className="inline-flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-yellow px-2.5 py-1 font-neo-display font-bold text-black shadow-[3px_3px_0_#000]">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
          <img src={COIN_ART} alt="" className="h-6 w-6" /> {t('adventurePlay.offerGold', { amount: loot.gold })}
        </motion.li>
      )}
      {loot.potions.map((id, k) => (
        <motion.li key={`p-${id}-${k}`} {...pop(i++)} className="inline-flex items-center gap-1.5 rounded-xl border-[3px] border-black bg-neo-lime px-2.5 py-1 font-bold text-black shadow-[3px_3px_0_#000]">
          {/* eslint-disable-next-line @next/next/no-img-element -- small static art */}
          <img src={potionArt(id)} alt="" className="h-6 w-6" /> {t(`adventurePlay.potion.${id}`)}
        </motion.li>
      ))}
      {loot.items.map((id) => {
        const item = getCollectibleById(id);
        const cat = item?.category ?? 'relic';
        const Icon = CAT_ICON[cat];
        return (
          <motion.li key={id} {...pop(i++)} className={`inline-flex items-center gap-1.5 rounded-xl border-[3px] border-black ${CAT_BG[cat]} px-2.5 py-1 font-bold text-black shadow-[3px_3px_0_#000]`}>
            <Icon className="h-5 w-5" /> <span className="text-sm">{item ? t(item.nameKey) : id}</span>
            <span className="rounded bg-black px-1 text-[9px] font-black uppercase text-neo-cream">{t('adventurePlay.loot.newItem')}</span>
          </motion.li>
        );
      })}
    </ul>
  );
}
