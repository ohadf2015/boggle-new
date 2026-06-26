import { memo, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';

const HeaderLogo = memo(() => {
    const { t, language } = useLanguage();
    const router = useRouter();

    const fontFamily = useMemo(() => {
        switch (language) {
            case 'he':
                return "'Fredoka', sans-serif";
            case 'ja':
                return "'Noto Sans JP', 'Rubik', sans-serif";
            default:
                return "'Fredoka', 'Rubik', sans-serif";
        }
    }, [language]);

    const handleLogoClick = useCallback(() => {
        const gameCode = sessionStorage.getItem('gameCode');
        const username = sessionStorage.getItem('username');

        if (gameCode && username) {
            window.dispatchEvent(new CustomEvent('requestRoomExit', {
                detail: { gameCode, username, source: 'logo' }
            }));
            return;
        }

        router.push(`/${language}`);
    }, [language, router]);

    return (
        <button
            type="button"
            className="flex items-center gap-0.5 xs:gap-1 cursor-pointer bg-transparent border-none p-0 shrink-0 relative active:scale-95 transition-transform"
            onClick={handleLogoClick}
            aria-label={t('common.goToHome')}
        >
            {/* Lime-light lightning bolt - left */}
            <svg
                className="player-accent-ink w-4 h-5 xs:w-5 xs:h-6 sm:w-5 sm:h-6 shrink-0 text-neo-black dark:text-neo-lime-light"
                viewBox="0 0 24 32"
                fill="none"
                style={{ transform: 'rotate(-15deg)', filter: 'drop-shadow(0 0 4px currentColor)' }}
                aria-hidden="true"
            >
                <path
                    d="M14 2L4 18h7l-3 12 13-18h-8l5-10H14z"
                    fill="currentColor"
                    stroke="#1a365d"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            </svg>

            <span
                className="font-black uppercase tracking-tight flex items-center gap-0.5 whitespace-nowrap"
                style={{ fontFamily }}
            >
                <span
                    className="player-accent-ink text-xl xs:text-2xl sm:text-2xl text-neo-black dark:text-neo-lime relative"
                    style={{
                        WebkitTextStroke: '2px #1a365d',
                        paintOrder: 'stroke fill',
                        textShadow: '3px 3px 0px #1a365d',
                    }}
                >
                    {t('logo.lexi')}
                </span>
                <span
                    className="text-base xs:text-lg sm:text-lg text-slate-800 dark:text-neo-cyan-muted relative"
                    style={{
                        WebkitTextStroke: '1px #1a365d',
                        paintOrder: 'stroke fill',
                        textShadow: '2px 2px 0px rgba(26, 54, 93, 0.7)',
                    }}
                >
                    {t('logo.clash')}
                </span>
            </span>

            {/* Cyan lightning bolt - right */}
            <svg
                className="w-4 h-5 xs:w-5 xs:h-6 sm:w-5 sm:h-6 shrink-0 text-neo-black dark:text-neo-cyan-light"
                viewBox="0 0 24 32"
                fill="none"
                style={{ transform: 'rotate(15deg)', filter: 'drop-shadow(0 0 4px currentColor)' }}
                aria-hidden="true"
            >
                <path
                    d="M14 2L4 18h7l-3 12 13-18h-8l5-10H14z"
                    fill="currentColor"
                    stroke="#1a365d"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            </svg>
        </button>
    );
});

HeaderLogo.displayName = 'HeaderLogo';

export default HeaderLogo;
