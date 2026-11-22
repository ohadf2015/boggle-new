import type { ReactNode } from 'react';
import {
    Settings, Trophy, ScrollText, Coffee, Accessibility, Info, HelpCircle, Mail, Cookie,
    Users, UserPlus, Bug, GraduationCap, Languages, ShieldCheck, Scale,
} from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { GiftNotificationBadge } from '../../gift/GiftNotificationBadge';
import { QuickLanguageSwitcher } from '../../QuickLanguageSwitcher';
import { InstagramIcon } from '@/components/icons/SocialIcons';
import { ManageCookiesButton } from '@/components/CookieConsent';
import GetAppMenuRow from '@/components/android-install/GetAppMenuRow';
import type { teacherMenuEntry } from '@/lib/education/teacherRole';
import {
    DrawerGroup, DrawerRowButton, DrawerRowLink, DrawerRowStatic, DrawerSection, DrawerTile, DRAWER_CHIP_CLASS,
} from './DrawerPrimitives';
import { DrawerMissions } from './DrawerMissions';

type Mission = Parameters<typeof DrawerMissions>[0]['missions'][number];

export function DrawerNavSections({
    closeMenu, isAuthenticated, isAdmin, teacherEntry, friendsBadgeCount,
    missions, completedCount, isGrandSlam, notificationsSlot, onReportBug,
}: {
    closeMenu: () => void;
    isAuthenticated: boolean;
    isAdmin: boolean;
    teacherEntry: ReturnType<typeof teacherMenuEntry>;
    friendsBadgeCount: number;
    missions: Mission[];
    completedCount: number;
    isGrandSlam: boolean;
    notificationsSlot: ReactNode;
    onReportBug: () => void;
}) {
    const { t, language } = useLanguage();

    return (
        <>
        {/* ── Main destinations ── */}
        <div className="grid grid-cols-2 gap-2.5" data-testid="drawer-quick-nav">
            <DrawerTile
                href={`/${language}/quests`}
                onClick={closeMenu}
                accent="lime"
                icon={<ScrollText className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />}
                label={t('nav.quests')}
                meta={isAuthenticated && missions.length > 0 ? `${completedCount}/${missions.length}` : undefined}
            />
            <DrawerTile
                href={`/${language}/friends`}
                onClick={closeMenu}
                accent="pink"
                icon={<UserPlus className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />}
                label={t('nav.friends')}
                badge={<GiftNotificationBadge count={friendsBadgeCount} />}
            />
            <DrawerTile
                href={`/${language}/leaderboard`}
                onClick={closeMenu}
                accent="cyan"
                icon={<Trophy className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />}
                label={t('nav.leaderboard')}
            />
            <DrawerTile
                href={`/${language}/community`}
                onClick={closeMenu}
                accent="purple"
                icon={<Users className="w-5 h-5" strokeWidth={2.5} aria-hidden="true" />}
                label={t('nav.community')}
            />
        </div>

        {isAuthenticated && missions.length > 0 && (
            <DrawerMissions
                missions={missions}
                completedCount={completedCount}
                isGrandSlam={isGrandSlam}
                closeMenu={closeMenu}
            />
        )}

        {notificationsSlot}

        <GetAppMenuRow onNavigate={closeMenu} />

        <DrawerSection label={t('education.nav.section')}>
            <DrawerGroup>
                <DrawerRowLink
                    href={`/${language}${teacherEntry.href}`}
                    onClick={closeMenu}
                    accent="lime"
                    icon={<GraduationCap className="w-4 h-4" aria-hidden="true" />}
                >
                    {t(teacherEntry.labelKey)}
                </DrawerRowLink>
            </DrawerGroup>
        </DrawerSection>

        {/* Phones reach admin from the bottom tab bar; desktop has no bottom bar. */}
        {isAdmin && (
            <DrawerSection label={t('common.admin')} className="hidden sm:flex" testId="drawer-admin">
                <DrawerGroup>
                    <DrawerRowLink
                        href={`/${language}/admin`}
                        onClick={closeMenu}
                        accent="purple"
                        icon={<ShieldCheck className="w-4 h-4" aria-hidden="true" />}
                    >
                        {t('common.adminDashboard')}
                    </DrawerRowLink>
                </DrawerGroup>
            </DrawerSection>
        )}

        <DrawerSection label={t('settings.title')}>
            <DrawerGroup>
                <DrawerRowStatic
                    accent="cyan"
                    icon={<Languages className="w-4 h-4" aria-hidden="true" />}
                    control={<QuickLanguageSwitcher showLabel />}
                >
                    {t('settings.language')}
                </DrawerRowStatic>
                <DrawerRowLink
                    href={`/${language}/settings#accessibility`}
                    onClick={closeMenu}
                    accent="cyan"
                    icon={<Accessibility className="w-4 h-4" aria-hidden="true" />}
                >
                    {t('settings.accessibility')}
                </DrawerRowLink>
                <DrawerRowLink
                    href={`/${language}/settings`}
                    onClick={closeMenu}
                    accent="cyan"
                    icon={<Settings className="w-4 h-4" aria-hidden="true" />}
                >
                    {t('settings.moreSettings')}
                </DrawerRowLink>
            </DrawerGroup>
        </DrawerSection>

        <DrawerSection label={t('common.info')}>
            <DrawerGroup>
                <DrawerRowButton
                    onClick={onReportBug}
                    accent="pink"
                    icon={<Bug className="w-4 h-4" aria-hidden="true" />}
                >
                    {t('bugReport.menuLabel')}
                </DrawerRowButton>
                <DrawerRowLink href={`/${language}/faq`} onClick={closeMenu} accent="purple" icon={<HelpCircle className="w-4 h-4" aria-hidden="true" />}>
                    {t('footer.faq')}
                </DrawerRowLink>
                <DrawerRowLink href={`/${language}/about`} onClick={closeMenu} accent="white" icon={<Info className="w-4 h-4" aria-hidden="true" />}>
                    {t('footer.about')}
                </DrawerRowLink>
                <DrawerRowLink href={`/${language}/contact`} onClick={closeMenu} accent="white" icon={<Mail className="w-4 h-4" aria-hidden="true" />}>
                    {t('footer.contact')}
                </DrawerRowLink>
                <DrawerRowLink href={`/${language}/legal`} onClick={closeMenu} accent="white" icon={<Scale className="w-4 h-4" aria-hidden="true" />}>
                    {t('legal.title')}
                </DrawerRowLink>
            </DrawerGroup>
        </DrawerSection>

        <div className="flex flex-wrap items-center gap-2">
            <a
                href="https://ko-fi.com/lexiclash"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                aria-label={`${t('support.kofiFooter')} (${t('common.opensInNewTab')})`}
                className={DRAWER_CHIP_CLASS}
            >
                <Coffee className="w-3.5 h-3.5 text-neo-pink" aria-hidden="true" />
                {t('support.kofiFooter')}
            </a>
            <a
                href="https://www.instagram.com/lexi.clash"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
                aria-label="Instagram"
                className={DRAWER_CHIP_CLASS}
            >
                <InstagramIcon className="w-3.5 h-3.5 text-neo-purple" size="0.875em" />
                Instagram
            </a>
            <span className={DRAWER_CHIP_CLASS} onClickCapture={closeMenu}>
                <Cookie className="w-3.5 h-3.5 text-neo-lime" aria-hidden="true" />
                <ManageCookiesButton />
            </span>
        </div>
        </>
    );
}
