'use client';

/**
 * The big live preview. Reacts to every change: a squash-and-stretch pop on
 * a committed pick, a curious head tilt on a try-on, plus the existing tier
 * burst when an equip raises the avatar's rarity. Nothing floats over the
 * avatar card: undo / randomize / DONE live in the bottom action bar, and the
 * try-on unlock panel sits below the stage, so the preview never shrinks.
 */
import { forwardRef, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Download, History, Trophy } from 'lucide-react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import AvatarRenderer from '../AvatarRenderer';
import AvatarTierEffects from '../AvatarTierEffects';
import AvatarEquipBurst from '../AvatarEquipBurst';
import type { EquipBurst } from '@/lib/avatar/equipBurst';

type T = (key: string, a?: string | Record<string, string | number>, b?: Record<string, string | number>) => string;

interface EditorStageProps {
  config: CustomAvatarConfig;
  changeCount: number;
  isTryOn: boolean;
  burst: EquipBurst | null;
  onDownload: () => void;
  onRestorePrevious?: () => void;
  collection: { owned: number; total: number } | null;
  /** Optional CTA (daily free-part reward) centered on the stage bottom — no-scroll home. */
  reward?: ReactNode;
  t: T;
}

const CORNER_BTN =
  'rounded-full border-[3px] border-black flex items-center justify-center shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-sm transition-transform disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan';

const EditorStage = forwardRef<HTMLDivElement, EditorStageProps>(function EditorStage(
  { config, changeCount, isTryOn, burst, onDownload, onRestorePrevious, collection, reward, t },
  ref,
) {
  const popRef = useRef<HTMLDivElement>(null);
  const firstRef = useRef(true);

  // Restart the CSS pop without remounting the SVG (a key change would re-render the whole avatar).
  useLayoutEffect(() => {
    const el = popRef.current;
    if (!el) return;
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    el.classList.remove('avatar-editor-pop', 'avatar-editor-tryon');
    void el.offsetWidth;
    el.classList.add(isTryOn ? 'avatar-editor-tryon' : 'avatar-editor-pop');
  }, [changeCount, isTryOn]);

  return (
    <div
      style={{ containerType: 'size' }}
      className="relative h-full w-full overflow-hidden bg-neo-navy-light [background-image:radial-gradient(rgba(255,255,255,0.07)_1.5px,transparent_1.5px)] [background-size:14px_14px]"
      data-testid="editor-stage"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Largest square that fits the stage in both directions (stage is a size container). */}
        <div className="relative" style={{ width: 'min(84cqw, 84cqh)', height: 'min(84cqw, 84cqh)' }}>
          {/* Floor shadow under the card */}
          <div aria-hidden="true" className="absolute inset-x-[12%] -bottom-[7%] h-[6%] rounded-[50%] bg-black/35" />
          <div className="avatar-editor-idle h-full w-full">
            <div ref={popRef} className="h-full w-full origin-bottom">
              <div className="h-full w-full rounded-neo-xl border-[3px] border-black shadow-hard-xl overflow-hidden">
                <AvatarTierEffects config={config} className="w-full h-full">
                  {/* ref sits directly on the renderer so download / glow-up grab ITS svg, not an effect svg */}
                  <div ref={ref} className="w-full h-full">
                    <AvatarRenderer config={config} size={320} className="w-full h-full" />
                  </div>
                </AvatarTierEffects>
              </div>
            </div>
          </div>
          <AvatarEquipBurst burst={burst} fireKey={changeCount} />
        </div>
      </div>

      {collection && (
        <div
          data-testid="editor-collection"
          title={t('avatarBuilder.editor.collection', { owned: collection.owned, total: collection.total })}
          className="absolute top-2 start-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-neo-navy/85 border-2 border-black text-neo-white text-[11px] font-black tabular-nums"
        >
          <Trophy size={12} aria-hidden="true" className="text-neo-yellow" />
          <span>{`${collection.owned}/${collection.total}`}</span>
          <span aria-hidden="true" className="block w-10 h-1.5 rounded-full bg-neo-white/15 overflow-hidden">
            <span className="block h-full bg-neo-yellow" style={{ width: `${Math.round((collection.owned / Math.max(1, collection.total)) * 100)}%` }} />
          </span>
          <span className="sr-only">{t('avatarBuilder.editor.collection', { owned: collection.owned, total: collection.total })}</span>
        </div>
      )}

      <div className="absolute top-2 end-2 flex gap-1.5">
        {onRestorePrevious && (
          <button type="button" onClick={onRestorePrevious} aria-label={t('avatarBuilder.restorePrevious')} title={t('avatarBuilder.restorePrevious')} className={`${CORNER_BTN} w-8 h-8 bg-neo-navy text-neo-white`}>
            <History size={14} aria-hidden="true" />
          </button>
        )}
        <button type="button" onClick={onDownload} aria-label={t('avatarBuilder.download')} title={t('avatarBuilder.download')} className={`${CORNER_BTN} w-8 h-8 bg-neo-navy text-neo-white`}>
          <Download size={14} aria-hidden="true" />
        </button>
      </div>

      {reward && (
        <div
          data-testid="avatar-builder-reward-slot"
          className="absolute bottom-2 inset-x-3 flex justify-center [&_button]:px-3 [&_button]:py-1.5 [&_button]:text-sm"
        >
          {reward}
        </div>
      )}
    </div>
  );
});

export default EditorStage;
