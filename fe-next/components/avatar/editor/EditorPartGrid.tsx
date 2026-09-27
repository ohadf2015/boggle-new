'use client';

import { memo, useEffect, useMemo, useRef } from 'react';
import { Check } from 'lucide-react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { CatalogPart } from '@/lib/avatar/catalog';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import EditorThumb from './EditorThumb';
import { getPartLockInfo, sortPartsForGrid, type LockPremium, type PartLockInfo } from './partLock';
import type { PartsSection } from './editorTabs';

type T = (key: string, a?: string | Record<string, string | number>, b?: Record<string, string | number>) => string;

interface EditorPartGridProps {
  section: PartsSection;
  /** Committed config (the thumbnails show parts on the player's own face). */
  config: CustomAvatarConfig;
  selected: string | undefined;
  /** Part currently being tried on in this section, if any. */
  tryOnId: string | null;
  premium: LockPremium | null;
  onPick: (section: PartsSection, id: string) => void;
  t: T;
  language: string;
}

/** A locked NEW part keeps ONE badge: the NEW marker rides inside its chip as a pink dot. */
function NewDot({ t }: { t: T }) {
  return (
    <span className="inline-block w-2 h-2 rounded-full bg-neo-pink border border-black" title={t('avatarBuilder.new')}>
      <span className="sr-only">{t('avatarBuilder.new')}</span>
    </span>
  );
}

function LockChip({ info, isNew, t, language }: { info: PartLockInfo; isNew: boolean; t: T; language: string }) {
  if (info.path === 'level' && info.unlockLevel != null) {
    const close = info.levelsToGo != null && info.levelsToGo <= 1;
    return (
      <span
        data-cell-badge="level"
        className={`inline-flex items-center gap-0.5 px-1.5 py-px rounded-full border-2 border-black text-[10px] font-black leading-none tabular-nums ${
          close ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy text-neo-white'
        }`}
      >
        {isNew && <NewDot t={t} />}
        {t('avatarBuilder.editor.levelChip', { level: info.unlockLevel })}
      </span>
    );
  }
  return (
    <span data-cell-badge="price" className="inline-flex items-center gap-0.5 px-1.5 py-px rounded-full border-2 border-black bg-neo-navy text-neo-yellow text-[10px] font-black leading-none tabular-nums">
      {isNew ? <NewDot t={t} /> : <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-neo-yellow border border-black" />}
      {safeToLocaleString(info.price, language)}
    </span>
  );
}

interface CellProps {
  part: CatalogPart;
  section: PartsSection;
  config: CustomAvatarConfig;
  isSelected: boolean;
  isTryOn: boolean;
  info: PartLockInfo;
  onPick: (section: PartsSection, id: string) => void;
  t: T;
  language: string;
}

const PartCell = memo(function PartCell({ part, section, config, isSelected, isTryOn, info, onPick, t, language }: CellProps) {
  const rarity = part.id === 'none' ? 'common' : info.rarity;
  const tok = RARITY_TOKENS[rarity];
  const special = rarity !== 'common';
  const tierLabel = t(tok.labelKey);
  return (
    <button
      type="button"
      data-testid="editor-part"
      data-tier={rarity}
      data-locked={info.locked ? 'true' : 'false'}
      aria-label={part.id}
      aria-pressed={isSelected}
      aria-current={isTryOn ? 'true' : undefined}
      title={special ? `${tierLabel}` : undefined}
      onClick={() => onPick(section, part.id)}
      style={special && !isSelected && rarity !== 'legendary' ? { borderColor: tok.hex, backgroundImage: `radial-gradient(circle at 50% 35%, ${tok.hex}33, transparent 70%)` } : undefined}
      className={`relative aspect-square w-full rounded-neo border-[3px] bg-neo-navy-light overflow-hidden transition-transform duration-150 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan ${
        isSelected
          ? 'border-neo-lime shadow-hard-lime'
          : special
              ? ''
              : 'border-neo-white/15 hover:border-neo-white/40'
      } ${rarity === 'legendary' && !isSelected ? 'avatar-editor-legendary' : ''} ${
        isTryOn ? 'outline-[3px] outline-dashed outline-neo-cyan outline-offset-2' : ''
      }`}
    >
      {part.id === 'none' ? (
        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
          <span className="block w-1/2 h-1/2 rounded-full border-[3px] border-neo-white/40 relative after:absolute after:inset-x-[-10%] after:top-1/2 after:h-[3px] after:bg-neo-white/40 after:-rotate-45" />
        </span>
      ) : (
        <EditorThumb category={section.category} id={part.id} config={config} size={72} />
      )}
      {rarity === 'legendary' && <span aria-hidden="true" className="avatar-editor-foil" />}

      {/* ONE badge per tile: equipped check › lock chip (Lv N / gold, NEW dot inside) › NEW ribbon. */}
      {isSelected ? (
        <span data-cell-badge="check" className="avatar-editor-check absolute top-1 end-1 w-5 h-5 rounded-full bg-neo-lime border-2 border-black flex items-center justify-center">
          <Check size={12} strokeWidth={4} className="text-neo-black" aria-hidden="true" />
        </span>
      ) : info.locked ? (
        <span className="absolute bottom-1 inset-x-0 flex justify-center">
          <LockChip info={info} isNew={!!part.isNew} t={t} language={language} />
        </span>
      ) : part.isNew ? (
        <span data-cell-badge="new" className="absolute top-1 start-1 px-1 rounded-sm bg-neo-pink text-neo-white text-[8px] font-black leading-tight border border-black">
          {t('avatarBuilder.new')}
        </span>
      ) : null}
    </button>
  );
});

export default function EditorPartGrid({ section, config, selected, tryOnId, premium, onPick, t, language }: EditorPartGridProps) {
  const rows = useMemo(() => {
    const byId = new Map(section.parts.map(p => [p.id, p]));
    return sortPartsForGrid(section.rarityCategory, section.parts.map(p => p.id), premium).map(id => ({
      part: byId.get(id)!,
      info: getPartLockInfo(section.rarityCategory, id, premium),
    }));
  }, [section, premium]);

  // The unlock strip appears below the grid when a part is tried on and takes
  // grid height: keep the tried-on tile visible once the layout has settled.
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!tryOnId) return;
    const raf = requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
      if (!el || typeof el.scrollIntoView !== 'function') return;
      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [tryOnId]);

  return (
    <div ref={gridRef} className="grid grid-cols-4 min-[520px]:grid-cols-5 md:grid-cols-5 gap-2">
      {rows.map(({ part, info }) => (
        <PartCell
          key={part.id}
          part={part}
          section={section}
          config={config}
          isSelected={(selected ?? 'none') === part.id}
          isTryOn={tryOnId === part.id}
          info={info}
          onPick={onPick}
          t={t}
          language={language}
        />
      ))}
    </div>
  );
}
