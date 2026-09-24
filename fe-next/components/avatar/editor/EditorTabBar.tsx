'use client';

import { useCallback, useRef } from 'react';
import { AVATAR_CATEGORY_ICONS, type AvatarCategoryKey } from '../AvatarCategoryIcons';
import type { EditorTab } from './editorTabs';

interface EditorTabBarProps {
  tabs: readonly EditorTab[];
  active: string;
  onSelect: (id: EditorTab['id']) => void;
  t: (key: string) => string;
  /** Tabs holding the part currently being tried on get a cyan dot. */
  dotTab?: string | null;
}

/** Icon-only tabs (Duolingo-style) with an underline; the name lives in aria-label + title. */
export default function EditorTabBar({ tabs, active, onSelect, t, dotTab }: EditorTabBarProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Arrow-key roving between tabs (WAI-ARIA tabs pattern), RTL-aware.
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
    const i = tabs.findIndex(tab => tab.id === active);
    const next = tabs[(i + step + tabs.length) % tabs.length];
    onSelect(next.id);
    listRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
    e.preventDefault();
  }, [tabs, active, onSelect]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t('avatarBuilder.title')}
      onKeyDown={onKeyDown}
      className="flex items-stretch overflow-x-auto avatar-editor-noscrollbar border-b-[3px] border-black bg-neo-navy"
    >
      {tabs.map(tab => {
        const isActive = tab.id === active;
        const Icon = AVATAR_CATEGORY_ICONS[tab.icon as AvatarCategoryKey] ?? AVATAR_CATEGORY_ICONS.base;
        const label = t(tab.labelKey);
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab={tab.id}
            data-testid={`editor-tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls="avatar-editor-panel"
            tabIndex={isActive ? 0 : -1}
            aria-label={label}
            title={label}
            onClick={() => onSelect(tab.id)}
            className={`relative flex-1 min-w-[44px] h-12 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:bg-neo-white/10 ${
              isActive ? 'text-neo-lime' : 'text-neo-white/60 hover:text-neo-white'
            }`}
          >
            <span className={`transition-transform duration-150 motion-reduce:transition-none ${isActive ? 'scale-110' : ''}`}>
              <Icon size={24} />
            </span>
            {dotTab === tab.id && !isActive && (
              <span aria-hidden="true" className="absolute top-2 end-2 w-2 h-2 rounded-full bg-neo-cyan border border-black" />
            )}
            <span
              aria-hidden="true"
              className={`absolute inset-x-2 -bottom-[3px] h-[4px] rounded-t-sm transition-colors ${isActive ? 'bg-neo-lime' : 'bg-transparent'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
