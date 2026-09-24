'use client';

/**
 * One tab's controls: pinned row (body type / main palette) above the ONLY
 * scrolling area in the editor (part grids, secondary palettes, presets).
 */
import type { ReactNode } from 'react';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { CatalogColor } from '@/lib/avatar/catalog';
import { SwatchRow, GenderToggle } from '../AvatarBuilderColorControls';
import EditorPartGrid from './EditorPartGrid';
import { COLOR_THEMES, EXPRESSION_PRESETS, type EditorTab, type PartsSection, type ColorSection } from './editorTabs';
import type { LockPremium } from './partLock';
import type { TryOn } from './editorState';

type T = (key: string, a?: string | Record<string, string | number>, b?: Record<string, string | number>) => string;

interface EditorPanelProps {
  tab: EditorTab;
  committed: CustomAvatarConfig;
  tryOn: TryOn | null;
  premium: LockPremium | null;
  onPickPart: (section: PartsSection, id: string) => void;
  onPickColor: (section: ColorSection, color: CatalogColor) => void;
  onGender: (g: CustomAvatarConfig['gender']) => void;
  onPatch: (patch: Partial<CustomAvatarConfig>) => void;
  /** Suppress pointer focus-scroll jumps inside the grid. */
  onScrollMouseDown: (e: React.MouseEvent) => void;
  /** Rendered at the end of the scroll area (reward / glow-up). */
  footer?: ReactNode;
  t: T;
  language: string;
}

const CHIP =
  'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-neo border-2 border-black bg-neo-navy-light text-neo-white text-xs font-bold shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none transition-transform';

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-neo-white/80 text-[11px] font-black uppercase tracking-wider mb-1.5">{children}</p>;
}

export default function EditorPanel({
  tab,
  committed,
  tryOn,
  premium,
  onPickPart,
  onPickColor,
  onGender,
  onPatch,
  onScrollMouseDown,
  footer,
  t,
  language,
}: EditorPanelProps) {
  const valueOf = (key: keyof CustomAvatarConfig) => committed[key] as string | undefined;
  const tryOnFor = (key: keyof CustomAvatarConfig) => (tryOn && tryOn.key === key ? tryOn.value : null);

  const swatches = (s: ColorSection, wrap: boolean) => (
    <SwatchRow
      key={s.palette}
      label={t(s.labelKey)}
      colors={s.colors}
      selected={valueOf(s.configKey)}
      tryOnHex={tryOnFor(s.configKey)}
      premium={premium}
      onPick={c => onPickColor(s, c)}
      wrap={wrap}
    />
  );

  return (
    <div id="avatar-editor-panel" role="tabpanel" aria-label={t(tab.labelKey)} className="flex-1 min-h-0 flex flex-col">
      {tab.pinned.length > 0 && (
        <div className="shrink-0 flex items-end gap-3 px-3 pt-2 pb-2 border-b-2 border-black/40">
          {tab.pinned.map(p =>
            p.kind === 'gender' ? (
              <GenderToggle key="gender" label={t(p.labelKey)} selected={committed.gender} onSelect={onGender} t={t} />
            ) : (
              <div key={p.palette} className="min-w-0 flex-1">
                {swatches(p, false)}
              </div>
            ),
          )}
        </div>
      )}

      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain avatar-editor-scroll px-3 pt-2.5 pb-6 space-y-4"
          onMouseDown={onScrollMouseDown}
          data-testid="editor-scroll"
        >
          {tab.sections.map(s => {
            if (s.kind === 'parts') {
              return (
                <section key={s.category} aria-label={t(s.labelKey)}>
                  {tab.sections.filter(x => x.kind === 'parts').length > 1 && <SectionLabel>{t(s.labelKey)}</SectionLabel>}
                  <EditorPartGrid
                    section={s}
                    config={committed}
                    selected={valueOf(s.configKey)}
                    tryOnId={tryOnFor(s.configKey)}
                    premium={premium}
                    onPick={onPickPart}
                    t={t}
                    language={language}
                  />
                </section>
              );
            }
            if (s.kind === 'colors') return <div key={s.palette}>{swatches(s, true)}</div>;
            if (s.kind === 'expressions') {
              return (
                <section key="expressions">
                  <SectionLabel>{t(s.labelKey)}</SectionLabel>
                  <div className="flex gap-1.5 overflow-x-auto avatar-editor-noscrollbar py-1 -my-1">
                    {EXPRESSION_PRESETS.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`${CHIP} shrink-0`}
                        onClick={() =>
                          onPatch({
                            eyes: p.eyes,
                            eyebrows: p.eyebrows,
                            mouth: p.mouth,
                          } as Partial<CustomAvatarConfig>)
                        }
                      >
                        <span aria-hidden="true" className="text-base leading-none">
                          {p.emoji}
                        </span>
                        <span>{t(p.labelKey)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            }
            return (
              <section key="themes">
                <SectionLabel>{t(s.labelKey)}</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_THEMES.map(th => (
                    <button key={th.id} type="button" className={CHIP} onClick={() => onPatch(th.colors)}>
                      <span className="flex -space-x-1" aria-hidden="true">
                        {[th.colors.bgColor, th.colors.shirtColor, th.colors.hairColor].map((c, i) => (
                          <span key={i} className="w-3.5 h-3.5 rounded-full border-2 border-black" style={{ backgroundColor: c }} />
                        ))}
                      </span>
                      <span>{t(th.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
          {footer}
        </div>
        {/* Soft floor above the action bar: a row scrolling under it reads as "more below", not "cut off". */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-neo-navy to-transparent" />
      </div>
    </div>
  );
}
