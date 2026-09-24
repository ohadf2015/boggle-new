'use client';

/**
 * Avatar editor (rebuilt 2026-09). One screen, no page scroll:
 *   header (cancel · title · gold)
 *   big live stage (pop on every change; nothing floats over the avatar)
 *   icon tabs → pinned palette row → the ONLY scrolling area (part grid)
 *   → try-on unlock panel (only while a locked part is on) → action bar
 *   (undo · randomize · DONE).
 * Desktop: centered modal, stage on the start side, controls on the end side.
 *
 * Contract kept for the 11 callers: default export, `AvatarPremium`,
 * `onSave(config)` (persistence stays with the caller), `premium=null` hides
 * premium parts, `previousConfig` enables restore. Locked parts are TRIED ON,
 * never saved: DONE always saves the committed draft.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Coins, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { type CustomAvatarConfig, getRandomAvatarConfig } from '@/shared/types/customAvatar';
import type { CatalogColor } from '@/lib/avatar/catalog';
import { COLLECTIBLE_PART_KEYS, getCollectionProgress } from '@/lib/avatar/unlocks';
import { planEquipBurst, type EquipBurst } from '@/lib/avatar/equipBurst';
import { getAvatarTier, type Tier } from './AvatarTierEffects';
import GlowUpButton from './GlowUpButton';
import { LobbyAvatarRewardButton } from './LobbyAvatarRewardButton';
import FloatingCoinAnimation from '@/components/game/FloatingCoinAnimation';
import EditorStage from './editor/EditorStage';
import EditorTabBar from './editor/EditorTabBar';
import EditorPanel from './editor/EditorPanel';
import UnlockPanel from './editor/UnlockPanel';
import EditorActionBar from './editor/EditorActionBar';
import { useAvatarEditor } from './editor/useAvatarEditor';
import { getEditorTabs, describeSlot, type ColorSection, type PartsSection, type EditorTab } from './editor/editorTabs';
import { getPartLockInfo } from './editor/partLock';
import { downloadAvatarPng } from './editor/downloadAvatar';
import './editor/avatarEditor.css';

export interface AvatarPremium {
  isPartUnlocked: (category: string, value: string) => boolean;
  unlockTemporarily: (category: string, value: string) => void;
  purchaseWithGold: (category: string, partId: string) => Promise<boolean>;
  isPurchasing: boolean;
  permanentUnlocks: string[];
  coins: number;
  /** Player level (drives "Lv N" progress copy + collection count). Optional for older callers. */
  level?: number;
}

interface AvatarBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CustomAvatarConfig) => void;
  initialConfig?: CustomAvatarConfig;
  /** Pass premium context to gate parts, or `null` to explicitly allow only free parts (e.g. onboarding). */
  premium: AvatarPremium | null;
  /** The player's previously-saved avatar — enables a "restore previous" action. */
  previousConfig?: CustomAvatarConfig | null;
}

export default function AvatarBuilderModal({ isOpen, onClose, onSave, initialConfig, premium, previousConfig }: AvatarBuilderModalProps) {
  const { t, language } = useLanguage();
  const editor = useAvatarEditor(isOpen, initialConfig);
  const { committed, preview, state, set, setMany, tryOn: tryOnPart, replace, saved } = editor;
  const [activeTab, setActiveTab] = useState<EditorTab['id']>('face');
  const [coinSpendAmount, setCoinSpendAmount] = useState<number | null>(null);
  const [burst, setBurst] = useState<EquipBurst | null>(null);
  const lastTierRef = useRef<Tier>(getAvatarTier(preview));
  const stageRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const tabs = useMemo(() => getEditorTabs(committed, { showPremium: !!premium }), [committed, premium]);
  const tab = tabs.find(x => x.id === activeTab) ?? tabs[0];

  useEffect(() => {
    if (isOpen) setActiveTab('face');
  }, [isOpen]);

  // Equip burst on each visible change (bigger when the tier goes up). Keyed on
  // changeCount, never on object identity, so it can't feed back into itself.
  const changeCount = state.changeCount;
  useEffect(() => {
    if (!isOpen) return;
    const next = getAvatarTier(preview);
    const plan = planEquipBurst(lastTierRef.current, next);
    lastTierRef.current = next;
    setBurst(plan.particles > 0 ? plan : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview changes exactly when changeCount does
  }, [changeCount, isOpen]);

  const pick = useCallback((key: keyof CustomAvatarConfig, rarityCategory: string, id: string) => {
    const info = getPartLockInfo(rarityCategory, id, premium);
    if (!info.locked) set(key, id);
    else if (premium) tryOnPart(key, id);
  }, [premium, set, tryOnPart]);

  const onPickPart = useCallback((s: PartsSection, id: string) => pick(s.configKey, s.rarityCategory, id), [pick]);
  const onPickColor = useCallback((s: ColorSection, c: CatalogColor) => pick(s.configKey, c.palette, c.hex), [pick]);
  const onGender = useCallback((g: CustomAvatarConfig['gender']) => set('gender', g), [set]);
  const onPatch = useCallback((patch: Partial<CustomAvatarConfig>) => setMany(patch, committed), [setMany, committed]);
  const onRandomize = useCallback(() => replace(getRandomAvatarConfig()), [replace]);
  const onRestorePrevious = useCallback(() => {
    if (previousConfig) replace(previousConfig);
  }, [replace, previousConfig]);
  const onDownload = useCallback(() => downloadAvatarPng(stageRef.current), []);

  const handleSave = useCallback(() => {
    saved(committed);
    onSave(committed);
    onClose();
  }, [saved, committed, onSave, onClose]);

  const tryOn = state.tryOn;
  const slot = tryOn ? describeSlot(tryOn.key) : null;
  const tryInfo = tryOn && slot ? getPartLockInfo(slot.rarityCategory, tryOn.value, premium) : null;

  const handleBuy = useCallback(async () => {
    if (!premium || !tryOn || !slot || !tryInfo) return;
    const ok = await premium.purchaseWithGold(slot.rarityCategory, tryOn.value);
    if (!ok) return;
    setCoinSpendAmount(tryInfo.price);
    set(tryOn.key, tryOn.value);
  }, [premium, tryOn, slot, tryInfo, set]);

  // Count from the SAME predicate the grid uses (isPartUnlocked), so the chip can
  // never say 0 while the grid shows level unlocks as owned.
  const collection = useMemo(() => {
    if (!premium) return null;
    const owned = COLLECTIBLE_PART_KEYS.filter(k => {
      const i = k.indexOf(':');
      return premium.isPartUnlocked(k.slice(0, i), k.slice(i + 1));
    });
    return getCollectionProgress(owned, premium.level);
  }, [premium]);

  // Portal only after mount: the server (and hydration pass) render nothing, so an
  // editor that starts open can't cause a hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useFocusTrap(dialogRef, isOpen && mounted, onClose);

  // Land initial focus on the title (announced by screen readers), not on the X:
  // the trap's first-focusable pick would draw a focus ring on "close" at open.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!isOpen || !mounted) return;
    const id = setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 140);
    return () => clearTimeout(id);
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!isOpen) return;
    // Lock <html> too: iOS Safari ignores overflow on <body> alone.
    const html = document.documentElement;
    const prevBody = document.body.style.overflow;
    const prevHtml = html.style.overflow;
    document.body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      html.style.overflow = prevHtml;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const tryOnTab = tryOn ? tabs.find(x => [...x.pinned, ...x.sections].some(s => 'configKey' in s && s.configKey === tryOn.key))?.id ?? null : null;

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-stretch md:items-center justify-center bg-black/70 md:bg-black/85 md:p-6 pb-[calc(min(var(--admob-banner-height,0px),120px)+min(var(--web-anchor-ad-height,0px),120px))] md:pb-[calc(1.5rem+min(var(--web-anchor-ad-height,0px),120px))]"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-builder-title"
        onClick={e => e.stopPropagation()}
        className="relative w-full h-full md:h-[min(700px,100%)] md:max-w-[900px] flex flex-col overflow-hidden bg-neo-navy md:border-[3px] md:border-black md:rounded-neo-xl md:shadow-hard-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom-6 duration-200"
      >
        <header className="shrink-0 flex items-center gap-2 h-14 px-2 border-b-[3px] border-black bg-neo-navy pt-[env(safe-area-inset-top)] box-content">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 shrink-0 rounded-neo flex items-center justify-center text-neo-white hover:bg-neo-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
          >
            <X size={22} strokeWidth={3} aria-hidden="true" />
            <span className="sr-only">{t('avatarBuilder.cancel')}</span>
          </button>
          <h2 ref={titleRef} tabIndex={-1} id="avatar-builder-title" style={{ outline: 'none' }} className="flex-1 min-w-0 truncate font-neo-display text-neo-white text-lg font-bold">
            {t('avatarBuilder.title')}
          </h2>
          {premium && (
            <div
              className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neo-navy-light border-2 border-black"
              title={t('avatarBuilder.balance')}
            >
              <Coins size={14} className="text-neo-yellow" aria-hidden="true" />
              <span className="text-neo-yellow font-black text-sm tabular-nums">{safeToLocaleString(premium.coins, language)}</span>
            </div>
          )}
        </header>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          <div className="shrink-0 h-[clamp(190px,36dvh,360px)] md:h-auto md:w-[44%] border-b-[3px] md:border-b-0 md:border-e-[3px] border-black">
            <EditorStage
              ref={stageRef}
              config={preview}
              changeCount={state.changeCount}
              isTryOn={!!tryOn}
              burst={burst}
              onDownload={onDownload}
              onRestorePrevious={previousConfig ? onRestorePrevious : undefined}
              collection={collection}
              reward={<LobbyAvatarRewardButton />}
              t={t}
            />
          </div>

          <div className="flex-1 min-h-0 min-w-0 flex flex-col">
            <EditorTabBar tabs={tabs} active={tab.id} onSelect={setActiveTab} t={t} dotTab={tryOnTab} />
            <EditorPanel
              key={tab.id}
              tab={tab}
              committed={committed}
              tryOn={tryOn}
              premium={premium}
              onPickPart={onPickPart}
              onPickColor={onPickColor}
              onGender={onGender}
              onPatch={onPatch}
              onScrollMouseDown={e => { if (shouldSuppressPointerFocus(e.target)) e.preventDefault(); }}
              t={t}
              language={language}
              footer={
                <div className="flex justify-center pt-2 empty:hidden">
                  <GlowUpButton previewRef={stageRef} config={committed} />
                </div>
              }
            />
            {premium && tryOn && slot && tryInfo && (
              <div className="shrink-0 px-2 pb-2 pt-1">
                <UnlockPanel
                  rarityCategory={slot.rarityCategory}
                  partId={tryOn.value}
                  categoryLabel={t(slot.labelKey)}
                  info={tryInfo}
                  premium={premium}
                  ownedKeys={premium.permanentUnlocks ?? []}
                  onBuy={handleBuy}
                  onTakeOff={editor.clearTryOn}
                  t={t}
                  language={language}
                />
              </div>
            )}
            <EditorActionBar canUndo={editor.canUndo} onUndo={editor.undo} onRandomize={onRandomize} onSave={handleSave} t={t} />
          </div>
        </div>

        <FloatingCoinAnimation coinAmount={coinSpendAmount} onAnimationComplete={() => setCoinSpendAmount(null)} />
      </div>
    </div>,
    document.body,
  );
}

/**
 * True when a pointer-down landed on (or inside) a button. Used to preventDefault
 * the pointer's native focus so clicking a part/colour button near the scroll
 * edge doesn't focus it and scroll the options list into view ("jump to start").
 * Keyboard Tab focus is a separate path and stays intact, as does the click.
 */
export function shouldSuppressPointerFocus(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!(el && typeof el.closest === 'function' && el.closest('button'));
}
