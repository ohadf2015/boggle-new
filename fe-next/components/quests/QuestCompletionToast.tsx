'use client';

/**
 * Quest completion celebration. Completions are QUEUED and play one after the
 * other (a game that finishes two quests plus the Grand Slam shows all three),
 * and each one draws a random cheer, mascot, confetti and sound for its tier.
 */

import toast from 'react-hot-toast';
import { Trophy, Star, Sparkles, Crown, Coins, X, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fireVictoryConfetti, fireFireworks, fireStreakConfetti, fireLevelUpConfetti } from '@/utils/confettiUtils';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { pickQuestReaction, type QuestConfetti, type QuestSound, type QuestTier } from '@/lib/quests/questReactions';

interface QuestCompletionOptions {
  questName: string;
  xpReward: number;
  goldReward?: number;
  isGrandSlam?: boolean;
  isAllComplete?: boolean;
  isWeekly?: boolean;
  /** PvP quest (beat a human) — the brag-worthy one, gets louder confetti. */
  isPvpWin?: boolean;
  /** Daily-mission progress after this completion; shown so the next reward feels close. */
  progress?: { done: number; total: number };
  /**
   * Stable key for in-tab dedup. Cross-device dedup is the server's celebrated
   * flags: call this only after the server reported newlyCelebrated.
   */
  dedupKey?: string;
  t?: (key: string, params?: Record<string, string | number>) => string;
  onComplete?: (sound: QuestSound) => void;
}

const recentToasts = new Set<string>();
const DEDUP_WINDOW_MS = 2000;

const DURATION_MS: Record<QuestTier, number> = {
  quest: 3200,
  pvp: 3800,
  weekly: 4200,
  grandSlam: 5000,
  allComplete: 6000,
};
/** When more celebrations are waiting, the current one yields after this long. */
const HURRY_MS = 2400;
const GAP_MS = 250;
const BIG: ReadonlySet<QuestTier> = new Set(['grandSlam', 'allComplete']);

interface Queued {
  opts: QuestCompletionOptions;
  tier: QuestTier;
  key: string;
}

const queue: Queued[] = [];
let playing: { id: string; tier: QuestTier; startedAt: number; timer: ReturnType<typeof setTimeout> } | null = null;

const tierOf = (o: QuestCompletionOptions): QuestTier =>
  o.isAllComplete ? 'allComplete' : o.isGrandSlam ? 'grandSlam' : o.isWeekly ? 'weekly' : o.isPvpWin ? 'pvp' : 'quest';

const CONFETTI: Record<QuestConfetti, () => void> = {
  victory: fireVictoryConfetti,
  streak: fireStreakConfetti,
  levelUp: fireLevelUpConfetti,
  fireworks: () => { fireFireworks(2, 1500); },
};

function fireConfettiFor(tier: QuestTier, flavor: QuestConfetti) {
  if (tier === 'allComplete') fireFireworks(4, 2500);
  else if (tier === 'grandSlam') fireFireworks(3, 2000);
  else CONFETTI[flavor]();
}

function scheduleAdvance(ms: number) {
  if (!playing) return;
  clearTimeout(playing.timer);
  playing.timer = setTimeout(() => {
    if (playing) toast.dismiss(playing.id);
    playing = null;
    setTimeout(playNext, GAP_MS);
  }, ms);
}

function hurryIfWaiting() {
  if (!playing || queue.length === 0) return;
  const left = DURATION_MS[playing.tier] - (Date.now() - playing.startedAt);
  const hurried = HURRY_MS - (Date.now() - playing.startedAt);
  if (hurried < left) scheduleAdvance(Math.max(0, hurried));
}

function playNext() {
  const next = queue.shift();
  if (!next) return;
  const id = render(next);
  playing = { id, tier: next.tier, startedAt: Date.now(), timer: setTimeout(() => {}, 0) };
  scheduleAdvance(DURATION_MS[next.tier]);
  hurryIfWaiting();
}

/** Queue a quest celebration. Plays now if nothing else is showing. */
export function showQuestCompletionToast(opts: QuestCompletionOptions) {
  const tier = tierOf(opts);
  const key = opts.dedupKey ?? `${opts.questName}:${tier}`;
  if (recentToasts.has(key)) return;
  recentToasts.add(key);
  setTimeout(() => recentToasts.delete(key), DEDUP_WINDOW_MS);

  const item = { opts, tier, key };
  // Small wins play before a waiting Grand Slam / All-done so the big one lands last.
  const bigAt = BIG.has(tier) ? -1 : queue.findIndex((q) => BIG.has(q.tier));
  if (bigAt >= 0) queue.splice(bigAt, 0, item);
  else queue.push(item);

  if (playing) hurryIfWaiting();
  else playNext();
}

/** Test seam: drop anything queued or playing. */
export function resetQuestToastQueue() {
  if (playing) clearTimeout(playing.timer);
  playing = null;
  queue.length = 0;
  recentToasts.clear();
}

const STYLE: Record<QuestTier, { bg: string; border: string; reward: string; Icon: typeof Trophy }> = {
  quest: { bg: 'from-neo-lime/20 via-neo-navy to-neo-navy', border: 'border-neo-lime', reward: 'text-neo-lime', Icon: Trophy },
  pvp: { bg: 'from-neo-orange/30 via-neo-navy to-neo-pink/15', border: 'border-neo-orange', reward: 'text-neo-orange', Icon: Swords },
  weekly: { bg: 'from-neo-cyan/30 via-neo-navy to-neo-purple/20', border: 'border-neo-cyan', reward: 'text-neo-cyan', Icon: Star },
  grandSlam: { bg: 'from-neo-pink/30 via-neo-navy to-neo-lime/15', border: 'border-neo-pink', reward: 'text-neo-pink', Icon: Sparkles },
  allComplete: { bg: 'from-neo-lime/30 via-neo-navy to-neo-cyan/20', border: 'border-neo-lime', reward: 'text-neo-lime', Icon: Crown },
};

function render({ opts, tier, key }: Queued): string {
  const { questName, xpReward, goldReward, progress, dedupKey, t = (k) => k, onComplete } = opts;
  const reaction = pickQuestReaction(tier);
  onComplete?.(reaction.sound);

  trackGrowthEvent('quest_completed', {
    tier: tier === 'allComplete' ? 'all_complete' : tier === 'grandSlam' ? 'grand_slam' : tier,
    xp: xpReward,
    gold: goldReward ?? 0,
    reaction: reaction.cheerKey.split('.').slice(-2).join('.'),
    ...(progress ? { done: progress.done, total: progress.total } : {}),
  });

  fireConfettiFor(tier, reaction.confetti);

  const s = STYLE[tier];
  const subtitle =
    tier === 'allComplete' ? t('quests.allCompleteDesc')
    : tier === 'grandSlam' ? t('quests.completion.grandSlamDesc')
    : questName;

  const toastId = `quest-toast-${dedupKey || key}-${Date.now()}`;

  toast.custom(
    (toastInstance) => (
      <div
        className={cn(
          'relative overflow-hidden w-full max-w-md mx-auto',
          'rounded-neo-lg border-3 border-neo-black shadow-hard-lg bg-linear-to-br',
          s.bg,
          s.border,
          toastInstance.visible
            ? 'animate-[celebrationPop_0.5s_cubic-bezier(0.34,1.56,0.64,1)_forwards]'
            : 'opacity-0 scale-50',
          'transition duration-300',
        )}
        role="status"
        aria-live="assertive"
        data-testid="quest-toast"
        data-tier={tier}
      >
        <button type="button"
          onClick={() => toast.dismiss(toastInstance.id)}
          className="absolute top-2 inset-e-2 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-neo-black/40 hover:bg-neo-black/60 text-neo-white transition-colors"
          aria-label={t('common.close')}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="absolute inset-0 bg-linear-to-r from-transparent via-neo-white/8 to-transparent animate-shimmer pointer-events-none" aria-hidden="true" />

        <div className="relative flex items-center gap-3 p-4 pe-10">
          <div className="relative shrink-0 w-20 h-20 motion-safe:animate-[mode-bomb-wobble_0.8s_ease-out_0.2s_both]">
            {/* eslint-disable-next-line @next/next/no-img-element -- tiny static cutout inside a toast portal */}
            <img
              src={reaction.mascot}
              alt=""
              width={80}
              height={80}
              className="w-20 h-20 object-contain drop-shadow-[3px_3px_0_var(--color-neo-black)]"
              data-testid="quest-toast-mascot"
            />
            <span className="absolute -bottom-1 -inset-e-1 w-7 h-7 flex items-center justify-center rounded-full border-2 border-neo-black bg-neo-yellow">
              <s.Icon className="w-4 h-4 text-neo-black" aria-hidden="true" />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-neo-display text-xl font-black text-neo-white leading-tight" data-testid="quest-toast-cheer">
              {t(reaction.cheerKey)}
            </p>
            {subtitle && (
              <p className="font-neo-body text-sm text-neo-white mt-0.5 truncate">{subtitle}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full bg-neo-black/30 border-2 border-neo-black',
                'font-neo-display text-sm font-black animate-[rewardSlide_0.4s_ease-out_0.35s_both]',
                s.reward,
              )}>
                <Star className="w-4 h-4" aria-hidden="true" />
                {t('quests.completion.xpReward', { xp: xpReward })}
              </span>
              {goldReward && goldReward > 0 ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neo-black/30 border-2 border-neo-black font-neo-display text-sm font-black text-neo-yellow animate-[rewardSlide_0.4s_ease-out_0.45s_both]">
                  <Coins className="w-4 h-4" aria-hidden="true" />
                  {t('quests.completion.goldReward', { gold: goldReward })}
                </span>
              ) : null}
            </div>
            {progress && (
              <p data-testid="quest-toast-progress" className="font-neo-body text-xs font-bold text-neo-cream mt-1.5">
                {t('quests.completion.progress', { done: progress.done, total: progress.total })}
              </p>
            )}
          </div>
        </div>
      </div>
    ),
    // The queue dismisses it; Infinity keeps react-hot-toast from racing that.
    { id: toastId, duration: Infinity, position: 'top-center' },
  );
  return toastId;
}
