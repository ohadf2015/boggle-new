import { useCallback, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import AuthButton from '../../auth/AuthButton';
import AvatarLite, { type AvatarLiteConfig } from '@/components/AvatarLite';
import { saveGuestNameEverywhere, ensureGuestDisplayName, markGuestNameChosen } from '../../../utils/guestManager';

export function DrawerGuestHero({ avatarConfig, closeMenu, onSignIn, onSignUp }: {
    avatarConfig: AvatarLiteConfig | null | undefined;
    closeMenu: () => void;
    onSignIn: () => void;
    onSignUp: () => void;
}) {
    const { t, language } = useLanguage();
    const [name, setName] = useState(() => ensureGuestDisplayName(language) || '');
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const startEdit = useCallback(() => {
        setDraft(name);
        setEditing(true);
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [name]);

    const save = useCallback(() => {
        const trimmed = draft.trim().slice(0, 20);
        if (trimmed) {
            saveGuestNameEverywhere(trimmed);
            markGuestNameChosen();
            setName(trimmed);
        }
        setEditing(false);
    }, [draft]);

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
                <div className="rounded-full border-3 border-neo-cream/40 bg-neo-navy p-0.5 shadow-hard-sm">
                    <AvatarLite customAvatar={avatarConfig} userId="guest" size="lg" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-neo-white/70">
                        {t('common.guest')}
                    </span>
                    {editing ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            maxLength={20}
                            aria-label={t('common.guest')}
                            className="w-full max-w-[180px] rounded-neo border-2 border-neo-cyan bg-neo-navy/80 px-2 py-1 text-base font-bold text-neo-white focus:outline-hidden focus:ring-2 focus:ring-neo-cyan"
                            onKeyDown={(e) => {
                                if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                                if (e.key === 'Enter') save();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                            onBlur={save}
                        />
                    ) : (
                        <button type="button" onClick={startEdit} className="group flex min-w-0 items-center gap-2 text-start">
                            <span className="truncate text-lg font-black text-neo-white transition-colors group-hover:text-neo-cyan">
                                {name || t('common.guest')}
                            </span>
                            <Pencil className="h-3.5 w-3.5 shrink-0 text-neo-white/70 transition-colors group-hover:text-neo-cyan" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>
            <AuthButton inline onClose={closeMenu} onSignInClick={onSignIn} onSignUpClick={onSignUp} />
        </div>
    );
}
