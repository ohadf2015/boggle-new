import { memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
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
        <motion.button
            className="flex items-center gap-0.5 xs:gap-1 sm:gap-1.5 cursor-pointer bg-transparent border-none p-0 flex-shrink-0 relative"
            onClick={handleLogoClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label={t('common.goToHome')}
        >
            {/* Lime-light lightning bolt - left */}
            <svg
                className="w-4 h-5 xs:w-5 xs:h-6 sm:w-6 sm:h-7 lg:w-7 lg:h-8 xl:w-8 xl:h-10 flex-shrink-0 text-neo-black dark:text-neo-lime-light animate-lightning-left"
                viewBox="0 0 24 32"
                fill="none"
                style={{ transform: 'rotate(-15deg)' }}
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
                    className="text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl text-neo-black dark:text-neo-lime relative animate-lexi-glow landscape:text-xl landscape:xs:text-2xl landscape:sm:text-3xl"
                    style={{
                        WebkitTextStroke: '3px #1a365d',
                        paintOrder: 'stroke fill',
                        textShadow: '4px 4px 0px #1a365d',
                    }}
                >
                    {t('logo.lexi')}
                </span>
                <span
                    className="text-base xs:text-lg sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl text-slate-800 dark:text-neo-cyan-muted relative landscape:text-base landscape:xs:text-lg landscape:sm:text-xl"
                    style={{
                        WebkitTextStroke: '1.5px #1a365d',
                        paintOrder: 'stroke fill',
                        textShadow: '2px 2px 0px rgba(26, 54, 93, 0.7)',
                    }}
                >
                    {t('logo.clash')}
                </span>
            </span>

            {/* Cyan lightning bolt - right */}
            <svg
                className="w-4 h-5 xs:w-5 xs:h-6 sm:w-6 sm:h-7 lg:w-7 lg:h-8 xl:w-8 xl:h-10 flex-shrink-0 text-neo-black dark:text-neo-cyan-light animate-lightning-right"
                viewBox="0 0 24 32"
                fill="none"
                style={{ transform: 'rotate(15deg)' }}
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
        </motion.button>
    );
});

HeaderLogo.displayName = 'HeaderLogo';

export default HeaderLogo;
