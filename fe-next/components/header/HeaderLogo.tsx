import { memo, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';

const TILE_TILT = ['-rotate-3', 'rotate-2', '-rotate-1', 'rotate-3', '-rotate-2'];

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

    const tiles = Array.from(t('logo.lexi'));

    return (
        <button
            type="button"
            className="group flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0 transition-transform active:scale-95"
            onClick={handleLogoClick}
            aria-label={t('common.goToHome')}
        >
            <span aria-hidden="true" className="relative flex items-center gap-1 whitespace-nowrap pe-2 sm:gap-1.5 sm:pe-2.5" style={{ fontFamily }}>
                <span data-testid="logo-tiles" className="flex items-center gap-[2px] sm:gap-[3px]">
                    {tiles.map((ch, i) => (
                        <span
                            key={i}
                            className={`flex h-[21px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] border-neo-black bg-neo-lime text-[13px] font-black uppercase leading-none text-neo-black shadow-[1.5px_1.5px_0_0_rgb(var(--neo-black))] sm:border-2 sm:shadow-[2px_2px_0_0_rgb(var(--neo-black))] transition-transform group-hover:-translate-y-0.5 sm:h-[30px] sm:w-[26px] sm:text-[19px] ${TILE_TILT[i % TILE_TILT.length]}`}
                        >
                            {ch}
                        </span>
                    ))}
                </span>
                <span className="relative">
                <span
                    className="-skew-x-6 text-[18px] font-black uppercase leading-none tracking-tight text-neo-cyan sm:text-[25px]"
                    style={{
                        WebkitTextStroke: '1.25px rgb(var(--neo-black))',
                        paintOrder: 'stroke fill',
                        textShadow: '1.5px 1.5px 0 rgb(var(--neo-black))',
                    }}
                >
                    {t('logo.clash')}
                </span>
                <svg
                    className="absolute -end-2.5 -top-2 h-[14px] w-[11px] rotate-12 text-neo-pink sm:-end-3.5 sm:h-5 sm:w-4"
                    viewBox="0 0 24 32"
                >
                    <path
                        d="M14 2L4 18h7l-3 12 13-18h-8l5-10H14z"
                        fill="currentColor"
                        stroke="rgb(var(--neo-black))"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                    />
                </svg>
                </span>
            </span>
        </button>
    );
});

HeaderLogo.displayName = 'HeaderLogo';

export default HeaderLogo;
