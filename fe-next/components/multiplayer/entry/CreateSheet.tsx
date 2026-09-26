'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_CONFIG } from '@/lib/languageConfig';
import { sanitizeRoomName } from '@/utils/consts';
import type { Language } from '@/shared/types/game';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';
import { MpSheet } from '../shell/MpSheet';
import { MpPrimaryCta } from '../shell/MpPrimaryCta';
import { defaultRoomName } from './defaultRoomName';
import { SheetIdentityRow } from './SheetIdentityRow';
import { useSheetIdentity } from './useSheetIdentity';
import { useSheetSide } from './useSheetSide';

export interface CreateRoomConfig {
  hostUsername: string;
  roomName: string;
  language: Language;
}

export interface CreateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isCreating: boolean;
  onCreate: (config: CreateRoomConfig) => void;
  defaultLanguage: Language;
  isAuthenticated: boolean;
  displayName: string | null;
  profileAvatar?: CustomAvatarConfig | null;
}

/** Board languages a room can be created in (one row of flags). */
const BOARD_LANGUAGES: Language[] = ['en', 'he', 'sv', 'ja', 'es'];
const MAX_ROOM_LENGTH = 30;

/**
 * CREATE (DESIGN §b.2): an MpSheet inside the entry — bottom sheet on phone,
 * 560px end panel on desktop. The name comes from the entry identity, so a
 * player with a usable name creates in ONE tap. Language is a single row of
 * five flags with only the active one labelled; the room name hides behind a
 * "+ name" link; the one CTA is START BATTLE.
 */
export default function CreateSheet({
  isOpen,
  onClose,
  isCreating,
  onCreate,
  defaultLanguage,
  isAuthenticated,
  displayName,
  profileAvatar,
}: CreateSheetProps) {
  const { t } = useLanguage();
  const side = useSheetSide();
  const id = useSheetIdentity({ isOpen, isAuthenticated, displayName, profileAvatar, nameLanguage: defaultLanguage });
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [roomName, setRoomName] = useState('');
  const [namingRoom, setNamingRoom] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLanguage(defaultLanguage);
    setRoomName('');
    setNamingRoom(false);
  }, [isOpen, defaultLanguage]);

  const create = () => {
    if (isCreating) return;
    const host = id.commit();
    if (!host) return;
    const typed = sanitizeRoomName(roomName.trim());
    onCreate({ hostUsername: host, roomName: typed || defaultRoomName(t, host), language });
  };

  return (
    <MpSheet open={isOpen} onClose={onClose} title={t('mpUi.entry.createTitle')} side={side} testId="create-sheet">
      <div className="flex flex-col gap-4">
        <SheetIdentityRow id={id} onEnter={create} />

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-neo-white/85">{t('mpUi.entry.boardLanguage')}</p>
          <div className="flex gap-2" role="group" aria-label={t('mpUi.entry.boardLanguage')}>
            {BOARD_LANGUAGES.map((code) => {
              const active = code === language;
              return (
                <button
                  key={code}
                  type="button"
                  data-testid={`create-lang-${code}`}
                  aria-pressed={active}
                  aria-label={LANGUAGE_CONFIG[code].nativeName}
                  onClick={() => setLanguage(code)}
                  className={cn(
                    'flex h-11 items-center justify-center gap-1.5 rounded-neo border-2 border-neo-black px-2.5 font-neo-display text-sm font-bold shadow-hard-sm transition-transform duration-100 active:translate-y-0.5 active:shadow-hard-pressed',
                    active ? 'flex-1 bg-neo-lime text-neo-black' : 'w-11 bg-neo-navy text-neo-white hover:-translate-y-0.5',
                  )}
                >
                  <span className="text-xl leading-none" aria-hidden="true">{LANGUAGE_CONFIG[code].flag}</span>
                  {active && <span data-chip-label="" className="truncate">{LANGUAGE_CONFIG[code].nativeName}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {namingRoom ? (
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.15em] text-neo-white/85">{t('mpUi.entry.roomName')}</span>
            <input
              autoFocus
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              maxLength={MAX_ROOM_LENGTH}
              dir="auto"
              aria-label={t('mpUi.entry.roomName')}
              placeholder={defaultRoomName(t, id.name)}
              className="h-11 w-full rounded-neo border-2 border-neo-black bg-neo-navy px-3 font-bold text-neo-white outline-hidden placeholder:text-neo-white/50 focus:border-neo-lime"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setNamingRoom(true)}
            className="self-start rounded-neo px-1 py-1 text-sm font-bold text-neo-cyan underline decoration-2 underline-offset-4 hover:text-neo-lime"
          >
            {t('mpUi.entry.addRoomName')}
          </button>
        )}

        <MpPrimaryCta
          tone="lime"
          testId="create-start-battle"
          label={t('mpUi.entry.startBattle')}
          onPress={create}
          loading={isCreating}
          className="shadow-hard-lg"
        />
      </div>
    </MpSheet>
  );
}
