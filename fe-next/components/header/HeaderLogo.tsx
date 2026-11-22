import { memo, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../../contexts/LanguageContext';

const HeaderLogo = memo(() => {
    const { t, language } = useLanguage();
    const router = useRouter();

    const fontFamily = useMemo(() => {
        switch (language) {
            case 'he':
                return "var(--font-fredoka-hebrew), var(--font-fredoka), sans-serif";
            case 'ja':
                return "'Noto Sans JP', var(--font-rubik), sans-serif";
            default:
                return undefined;
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
            className="flex h-[21px] shrink-0 cursor-pointer items-center border-none bg-transparent p-0 transition-transform active:scale-95 sm:h-[30px]"
            onClick={handleLogoClick}
            aria-label={t('common.goToHome')}
        >
            <span
                aria-hidden="true"
                data-testid="logo-wordmark"
                className="whitespace-nowrap font-neo-display text-[21px] font-bold leading-none tracking-tight text-neo-cream sm:text-[28px]"
                style={{ fontFamily }}
            >
                {t('logo.lexi')}<span className="text-neo-lime">{t('logo.clash')}</span>
            </span>
        </button>
    );
});

HeaderLogo.displayName = 'HeaderLogo';

export default HeaderLogo;
