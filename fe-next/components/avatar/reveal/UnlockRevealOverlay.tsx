'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Share2, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import type { LevelUnlock } from '@/lib/avatar/unlocks';
import { REVEAL_CATEGORY_KEY, revealPartNameKey, type UnlockReveal } from '@/lib/avatar/revealTrigger';
import { shareWithFallback } from '@/utils/shareWithFallback';
import RevealBurst, { BURST_CENTER_X, BURST_CENTER_Y } from './RevealBurst';
import RevealConfetti from './RevealConfetti';
import RevealStage, { STAGE_ASPECT } from './RevealStage';
import { attitudeConfig, revealAttitude, revealVoiceKey } from './revealAttitude';
import { REVEAL_CSS, REVEAL_THEMES } from './revealTheme';

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export interface UnlockRevealOverlayProps {
  reveal: UnlockReveal;
  /** The player's current avatar — shown wearing each new part. */
  config: CustomAvatarConfig;
  isGuest: boolean;
  /** Persist the part on the player's avatar. Resolve false on failure. */
  onEquip: (unlock: LevelUnlock) => Promise<boolean>;
  onSignUp: () => void;
  onClose: () => void;
  /** Fired once when the reveal first paints (telemetry). */
  onShown?: () => void;
  /** Force the static burst (the OS setting is honored via CSS regardless). */
  reducedMotion?: boolean;
  /** Render into document.body (default). The lab/tests can render inline. */
  portal?: boolean;
  /** Link the Share button sends (public profile when known). Defaults to the site. */
  shareUrl?: string;
}

type EquipState = 'idle' | 'saving' | 'done' | 'error';
const ADVANCE_AFTER_EQUIP_MS = 700;

const OUTLINED: CSSProperties = { WebkitTextStroke: '2px #000', paintOrder: 'stroke fill', textShadow: '4px 4px 0 #000' };
const OUTLINED_SM: CSSProperties = { WebkitTextStroke: '1.5px #000', paintOrder: 'stroke fill', textShadow: '3px 3px 0 #000' };
/** Stage size: as big as its box allows (container units), capped for huge screens. */
const STAGE_WIDTH = `min(100cqw, calc(100cqh * ${STAGE_ASPECT.toFixed(4)}), 560px)`;
const PRESS = 'active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform';

/**
 * Fullscreen "you unlocked X" moment: the rarity's light burst, a slammed
 * rarity word, and the player's OWN avatar popping out of a reward box wearing
 * the new part, pulling that item's face with its own effect around it; then
 * the part name, a one-liner with some voice, and Share / Equip now / Later.
 * Several unlocks from one level-up are shown one at a time ("2 of 3", tap).
 * Phones stack it; wide screens put the stage beside the words.
 *
 * Presentational: all side effects (saving, telemetry, auth) come in as props,
 * so the /avatar-test lab renders this exact component with fixtures.
 */
export default function UnlockRevealOverlay({
  reveal,
  config,
  isGuest,
  onEquip,
  onSignUp,
  onClose,
  onShown,
  reducedMotion = false,
  portal = true,
  shareUrl,
}: UnlockRevealOverlayProps) {
  const { t, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [index, setIndex] = useState(0);
  const [equip, setEquip] = useState<EquipState>('idle');
  const [mounted, setMounted] = useState(!portal);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const shownRef = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [burst, setBurst] = useState({ x: BURST_CENTER_X, y: BURST_CENTER_Y });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = reveal.unlocks.length;
  const unlock = reveal.unlocks[Math.min(index, total - 1)];
  const hasNext = index < total - 1;
  const theme = REVEAL_THEMES[unlock.rarity];
  const token = RARITY_TOKENS[unlock.rarity];
  const attitude = revealAttitude(unlock);
  const wearing = attitudeConfig(config, unlock);
  const categoryLabel = t(REVEAL_CATEGORY_KEY[unlock.category]);
  const partName = t(revealPartNameKey(unlock), categoryLabel);
  const rarityLabel = t(token.labelKey);

  useEffect(() => { if (portal) setMounted(true); }, [portal]);

  // Center the light burst behind the avatar's head, wherever the layout put the stage.
  useIsoLayoutEffect(() => {
    const el = stageRef.current;
    if (!mounted || !el) return;
    const place = () => {
      const r = el.getBoundingClientRect();
      if (r.height > 0) setBurst({ x: `${Math.round(r.left + r.width / 2)}px`, y: `${Math.round(r.top + r.height * 0.38)}px` });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [mounted, index]);

  useEffect(() => {
    if (shownRef.current) return;
    shownRef.current = true;
    onShown?.();
  }, [onShown]);

  // Scroll lock while the reveal owns the screen.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const advance = useCallback(() => {
    setIndex(i => Math.min(i + 1, total - 1));
    setEquip('idle');
    setCopied(false);
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (hasNext) advance();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, advance, hasNext]);

  useEffect(() => {
    if (mounted) primaryRef.current?.focus({ preventScroll: true });
  }, [mounted, index]);

  const handleEquip = async () => {
    if (equip === 'saving' || equip === 'done') return;
    setEquip('saving');
    let ok = false;
    try {
      ok = await onEquip(unlock);
    } catch {
      ok = false;
    }
    if (!ok) {
      setEquip('error');
      return;
    }
    setEquip('done');
    timerRef.current = setTimeout(() => {
      if (hasNext) advance();
      else onClose();
    }, ADVANCE_AFTER_EQUIP_MS);
  };

  const handleShare = async () => {
    const url = shareUrl ?? (typeof window !== 'undefined' ? `${window.location.origin}/${language}` : undefined);
    const result = await shareWithFallback({
      title: t('revealUnlock.kicker'),
      text: t('revealUnlock.shareText', { part: partName, rarity: rarityLabel }),
      url,
    });
    if (result === 'copied') setCopied(true);
  };

  if (!mounted) return null;

  const titleId = 'unlock-reveal-title';

  const node = (
    <div
      data-testid="unlock-reveal"
      data-rarity={unlock.rarity}
      data-motion={reducedMotion ? 'static' : 'full'}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby="unlock-reveal-name"
      className="fixed inset-0 z-[150] bg-neo-navy text-neo-white overflow-hidden select-none"
    >
      <style>{REVEAL_CSS}</style>
      <RevealBurst theme={theme} centerX={burst.x} centerY={burst.y} />
      <RevealConfetti key={`c-${index}`} theme={theme} centerX={burst.x} centerY={burst.y} />

      <div
        className="relative h-full flex flex-col items-center px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] lg:grid-rows-[1fr_auto_auto_1fr] lg:items-center lg:gap-x-12 lg:px-14"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 18px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
      >
        {/* Kicker + rarity word */}
        <div className="flex flex-col items-center gap-2 shrink-0 lg:col-start-2 lg:row-start-2 lg:items-start" key={`t-${index}`}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-neo border-2 border-black bg-black text-neo-white text-[11px] sm:text-xs font-black uppercase tracking-[0.18em] -rotate-2 shadow-hard-sm">
            <Sparkles className="w-3.5 h-3.5" style={{ color: theme.hex }} aria-hidden="true" />
            {t('revealUnlock.kicker')}
          </span>
          <h2
            id={titleId}
            className="lcr-anim lcr-slam font-neo-display font-black italic uppercase leading-none tracking-tight text-[clamp(44px,14vw,84px)] lg:text-[88px]"
            style={{ ...OUTLINED, color: theme.hex }}
          >
            {rarityLabel}
          </h2>
        </div>

        {/* Stage: tapping it advances when more unlocks are waiting. */}
        <button
          type="button"
          data-testid="unlock-reveal-stage"
          onClick={hasNext ? advance : undefined}
          aria-label={hasNext ? t('revealUnlock.tapNext') : undefined}
          tabIndex={hasNext ? 0 : -1}
          className="relative flex-1 min-h-0 w-full flex items-center justify-center outline-none lg:col-start-1 lg:row-start-1 lg:row-span-4 lg:h-full"
          style={{ cursor: hasNext ? 'pointer' : 'default', containerType: 'size' }}
        >
          <span className="block" style={{ width: STAGE_WIDTH }}>
            <RevealStage key={`s-${index}`} ref={stageRef} unlock={unlock} attitude={attitude} wearing={wearing} theme={theme} />
          </span>
        </button>

        {/* Name, one-liner, tags, counter, actions */}
        <div className="w-full max-w-sm flex flex-col items-center shrink-0 lg:max-w-none lg:col-start-2 lg:row-start-3 lg:items-start">
          <div key={`n-${index}`} className="lcr-anim lcr-rise flex flex-col items-center text-center lg:items-start lg:text-start">
            <p id="unlock-reveal-name" className="font-neo-display font-black uppercase leading-[1.02] text-[clamp(26px,7.6vw,40px)] lg:text-[46px]" style={OUTLINED_SM}>
              {partName}
            </p>
            <p className="mt-1.5 max-w-[22rem] font-neo-body font-bold text-[15px] sm:text-base leading-snug text-neo-white" style={{ textShadow: '2px 2px 0 #000' }}>
              {t(revealVoiceKey(unlock))}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
              <span className="px-1.5 py-0.5 rounded-md border-2 border-black bg-neo-lime text-neo-black text-[11px] font-black uppercase tracking-wider">
                {t('revealUnlock.unlockedAt', { level: unlock.level })}
              </span>
              <span className="px-1.5 py-0.5 rounded-md border-2 border-black bg-black text-neo-white text-[11px] font-black uppercase tracking-wider">
                {categoryLabel}
              </span>
            </div>
          </div>

          {total > 1 && (
            <div className="flex flex-col items-center gap-1 mt-2.5 lg:items-start">
              <div className="flex items-center gap-1.5" aria-hidden="true">
                {reveal.unlocks.map((u, i) => (
                  <span
                    key={`${u.category}:${u.partId}`}
                    className="h-2.5 rounded-full border-2 border-black transition-all"
                    style={{ width: i === index ? 22 : 10, background: i <= index ? REVEAL_THEMES[u.rarity].hex : 'rgba(255,255,255,.25)' }}
                  />
                ))}
              </div>
              <p data-testid="unlock-reveal-counter" className="text-[11px] font-bold text-neo-white/85 tabular-nums" aria-live="polite">
                {t('revealUnlock.counter', { current: index + 1, total })}
                {hasNext && <span className="ms-1.5 text-neo-white/60">· {t('revealUnlock.tapNext')}</span>}
              </p>
            </div>
          )}

          <div className="w-full flex flex-col gap-2 mt-3">
            <div className="flex items-stretch gap-2.5">
              <button
                type="button"
                onClick={handleShare}
                aria-label={t('revealUnlock.share')}
                title={t('revealUnlock.share')}
                className={`h-14 w-14 shrink-0 inline-flex items-center justify-center rounded-neo border-3 border-black bg-neo-navy text-neo-white shadow-hard ${PRESS}`}
                style={{ boxShadow: `inset 0 0 0 2px ${theme.hex}, 4px 4px 0 #000` }}
              >
                <Share2 className="w-6 h-6" style={{ color: theme.hex }} aria-hidden="true" />
              </button>
              {isGuest ? (
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={onSignUp}
                  className={`h-14 flex-1 min-w-0 rounded-neo border-3 border-black shadow-hard font-neo-display font-black text-lg uppercase tracking-wide text-neo-black ${PRESS}`}
                  style={{ background: theme.hex }}
                >
                  {t('revealUnlock.guestTitle')}
                </button>
              ) : (
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={handleEquip}
                  aria-busy={equip === 'saving'}
                  className={`h-14 flex-1 min-w-0 inline-flex items-center justify-center gap-2 rounded-neo border-3 border-black shadow-hard font-neo-display font-black text-lg uppercase tracking-wide text-neo-black disabled:opacity-80 ${PRESS}`}
                  style={{ background: equip === 'done' ? '#BFFF00' : theme.hex }}
                  disabled={equip === 'saving'}
                >
                  {equip === 'done' && <Check className="w-5 h-5" aria-hidden="true" />}
                  {equip === 'saving' ? t('revealUnlock.equipping') : equip === 'done' ? t('revealUnlock.equipped') : t('revealUnlock.equip')}
                </button>
              )}
            </div>
            {isGuest && <p className="text-center text-xs font-bold text-neo-white/85 lg:text-start">{t('revealUnlock.guestBody')}</p>}
            {copied && (
              <p role="status" className="text-center text-xs font-black text-neo-black bg-neo-lime border-2 border-black rounded-md py-1">{t('revealUnlock.copied')}</p>
            )}
            {equip === 'error' && (
              <p role="alert" className="text-center text-xs font-black text-neo-white bg-black/70 rounded-md py-1">{t('revealUnlock.equipError')}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-11 w-full inline-flex items-center justify-center gap-1 rounded-neo font-bold text-sm text-neo-white/90 hover:text-neo-white"
            >
              {t('revealUnlock.later')}
              <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return portal ? createPortal(node, document.body) : node;
}
