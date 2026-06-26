'use client';

import { useCallback, useState } from 'react';
import { m } from 'framer-motion';
import {
  Users,
  UserCheck,
  Coins,
  Copy,
  Check,
  Share2,
  Trophy,
  QrCode,
} from 'lucide-react';
import dynamic from 'next/dynamic';
const QRCodeSVG = dynamic(() => import('qrcode.react').then(m => ({ default: m.QRCodeSVG })), { ssr: false });
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/utils/ThemeContext';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';
import { Loader } from '@/components/ui/Loader';
import { trackShare } from '@/utils/growthTracking';
import AuthModal from '@/components/auth/AuthModal';
import {
  useReferralDashboard,
  type ReferralMilestoneData,
  type ReferralEntry,
} from '@/hooks/useReferralDashboard';

/* ─── WhatsApp icon ─── */
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/* ─── Stat card ─── */
function StatCard({
  icon,
  value,
  label,
  accentClass,
  delay,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accentClass: string;
  delay: number;
}) {
  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-neo border-3 border-neo-black shadow-hard p-4',
        'bg-neo-navy-light/80 flex flex-col items-center gap-1'
      )}
    >
      <div className={cn('p-2 rounded-neo border-2 border-neo-black/30', accentClass)}>
        {icon}
      </div>
      <span className="text-2xl font-black text-neo-white font-neo-display">{value}</span>
      <span className="text-xs font-bold text-neo-white uppercase tracking-wide text-center">
        {label}
      </span>
    </m.div>
  );
}

/* ─── Milestone bar ─── */
function MilestoneProgress({
  milestones,
  totalJoined,
}: {
  milestones: ReferralMilestoneData[];
  totalJoined: number;
}) {
  const { t } = useLanguage();
  const maxThreshold = milestones[milestones.length - 1]?.threshold ?? 50;
  const pct = Math.min((totalJoined / maxThreshold) * 100, 100);

  const tierColors: Record<string, string> = {
    bronze: 'bg-amber-600',
    silver: 'bg-gray-400',
    gold: 'bg-yellow-400',
    diamond: 'bg-neo-cyan',
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="rounded-neo border-3 border-neo-black shadow-hard bg-neo-navy-light/80 p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-neo-yellow" aria-hidden="true" />
        <h3 className="font-black text-sm uppercase text-neo-white font-neo-display">
          {t('referralDashboard.milestone')}
        </h3>
      </div>

      {/* Progress bar */}
      <div className="relative h-5 rounded-neo border-3 border-neo-black bg-neo-navy-elevated overflow-hidden mb-4">
        <div
          className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 bg-linear-to-r rtl:bg-linear-to-l from-neo-lime to-neo-cyan transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
        {/* Milestone markers */}
        {milestones.map(m => {
          const pos = (m.threshold / maxThreshold) * 100;
          return (
            <div
              key={m.id}
              className="absolute top-0 bottom-0 w-0.5 bg-neo-black/60"
              style={{ left: `${pos}%` }}
            />
          );
        })}
      </div>

      {/* Milestone labels */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {milestones.map(m => (
          <div
            key={m.id}
            className={cn(
              'rounded-neo border-2 p-2 text-center transition-colors',
              m.reached
                ? 'border-neo-lime/60 bg-neo-lime/10'
                : 'border-neo-black/30 bg-neo-navy-elevated/50'
            )}
          >
            <div
              className={cn(
                'w-4 h-4 rounded-full mx-auto mb-1 border-2 border-neo-black/40',
                tierColors[m.id] || 'bg-gray-500'
              )}
            />
            <div className="text-[10px] font-bold text-neo-white uppercase">{m.label}</div>
            <div className="text-xs font-black text-neo-white">
              {m.threshold} {t('referralDashboard.friendsJoined').toLowerCase()}
            </div>
            <div className="text-xs font-bold text-neo-yellow">+{m.coins}</div>
            {m.reached && (
              <Check className="w-3 h-3 text-neo-lime mx-auto mt-0.5" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </m.div>
  );
}

/* ─── Referral list ─── */
function ReferralList({ referrals }: { referrals: ReferralEntry[] }) {
  const { t } = useLanguage();

  const statusLabel = (s: ReferralEntry['status']) => {
    const map: Record<string, string> = {
      active: t('referralDashboard.active'),
      invited: t('referralDashboard.invited'),
      inactive: t('referralDashboard.inactive'),
    };
    return map[s] ?? s;
  };

  const statusColor = (s: ReferralEntry['status']) => {
    const map: Record<string, string> = {
      active: 'bg-neo-lime/20 text-neo-lime border-neo-lime/40',
      invited: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
      inactive: 'bg-neo-white/10 text-neo-white border-neo-white/20',
    };
    return map[s] ?? '';
  };

  if (referrals.length === 0) {
    return (
      <m.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-neo border-3 border-neo-black shadow-hard bg-neo-navy-light/80 p-6 text-center"
      >
        <Users className="w-8 h-8 text-neo-white mx-auto mb-2" aria-hidden="true" />
        <p className="text-sm font-bold text-neo-white">
          {t('referralDashboard.noReferrals')}
        </p>
      </m.div>
    );
  }

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="rounded-neo border-3 border-neo-black shadow-hard bg-neo-navy-light/80 overflow-hidden"
    >
      <div className="p-4 border-b-3 border-neo-black/30">
        <h3 className="font-black text-sm uppercase text-neo-white font-neo-display">
          {t('referralDashboard.recentReferrals')}
        </h3>
      </div>
      <ul className="divide-y divide-neo-black/20">
        {referrals.map(r => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            {/* Avatar */}
            <div
              className="w-9 h-9 rounded-neo border-2 border-neo-black flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: r.avatarColor || 'var(--neo-gray)' }}
            >
              {r.avatarEmoji || (r.displayName?.[0] ?? r.username?.[0] ?? '?')}
            </div>
            {/* Name + date */}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-neo-white truncate">
                {r.displayName || r.username || '?'}
              </div>
              <div className="text-[10px] text-neo-white">
                {new Date(r.createdAt).toLocaleDateString()}
              </div>
            </div>
            {/* Status badge */}
            <span
              className={cn(
                'text-[10px] font-bold uppercase px-2 py-0.5 rounded-neo border',
                statusColor(r.status)
              )}
            >
              {statusLabel(r.status)}
            </span>
          </li>
        ))}
      </ul>
    </m.div>
  );
}

/* ─── Main dashboard ─── */
export default function ReferralDashboardClient() {
  const { t } = useLanguage();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const { data, isLoading, error, copied, handleCopy } = useReferralDashboard();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const isDarkMode = theme === 'dark';

  const handleShare = useCallback(
    async (platform: 'whatsapp' | 'native') => {
      if (!data?.shareUrl) return;
      const shareText = t('referralDashboard.shareText', { code: data.referralCode });

      if (platform === 'native' && navigator.share) {
        try {
          await navigator.share({ title: 'LexiClash', text: shareText, url: data.shareUrl });
          trackShare('native');
          return;
        } catch {
          /* cancelled */
        }
      }

      if (platform === 'whatsapp') {
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${data.shareUrl}`)}`,
          '_blank',
          'noopener,noreferrer'
        );
        trackShare('whatsapp');
      }
    },
    [data, t]
  );

  /* Auth gate */
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <Users className="w-12 h-12 text-neo-pink mb-4" />
          <p className="text-neo-white font-bold text-center mb-4">
            {t('referralDashboard.loginRequired')}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => { setAuthModalMode('signup'); setShowAuthModal(true); }}
              className="px-6 py-3 bg-neo-lime text-neo-black font-bold rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-none transition-shadow"
            >
              {t('auth.signUp')}
            </button>
            <button
              type="button"
              onClick={() => { setAuthModalMode('signin'); setShowAuthModal(true); }}
              className="px-6 py-3 bg-neo-pink text-white font-bold rounded-neo border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-none transition-shadow"
            >
              {t('auth.signIn')}
            </button>
          </div>
          {showAuthModal && <AuthModal isOpen onClose={() => setShowAuthModal(false)} initialMode={authModalMode} showGuestStats />}
        </div>
      </div>
    );
  }

  /* Loading */
  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center">
        <Loader size="lg" />
      </div>
    );
  }

  /* Error */
  if (error && error !== 'unauthorized') {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center p-6">
        <p className="text-red-400 font-bold text-sm mb-2">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="text-neo-cyan text-sm font-bold underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-neo-navy pb-24">
      <Header />

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <h1 className="font-black text-2xl uppercase text-neo-white font-neo-display">
          {t('referralDashboard.title')}
        </h1>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Users className="w-5 h-5 text-neo-pink" />}
            value={data.totalInvited}
            label={t('referralDashboard.friendsInvited')}
            accentClass="bg-neo-pink/20"
            delay={0.05}
          />
          <StatCard
            icon={<UserCheck className="w-5 h-5 text-neo-lime" />}
            value={data.totalJoined}
            label={t('referralDashboard.friendsJoined')}
            accentClass="bg-neo-lime/20"
            delay={0.1}
          />
          <StatCard
            icon={<Coins className="w-5 h-5 text-neo-yellow" />}
            value={data.coinsEarned}
            label={t('referralDashboard.coinsEarned')}
            accentClass="bg-neo-yellow/20"
            delay={0.15}
          />
        </div>

        {/* Milestone progress */}
        <MilestoneProgress milestones={data.milestones} totalJoined={data.totalJoined} />

        {/* Your link + QR */}
        <m.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-neo border-3 border-neo-black shadow-hard bg-neo-navy-light/80 p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <QrCode className="w-5 h-5 text-neo-cyan" aria-hidden="true" />
            <h3 className="font-black text-sm uppercase text-neo-white font-neo-display">
              {t('referralDashboard.yourLink')}
            </h3>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <div className="bg-white p-3 rounded-neo border-3 border-neo-black shadow-hard-sm">
              <QRCodeSVG value={data.shareUrl} size={140} level="M" />
            </div>
          </div>

          {/* URL display + copy */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 bg-neo-navy-elevated/60 rounded-neo border-2 border-neo-black/30 px-3 py-2 text-xs text-neo-white font-mono truncate">
              {data.shareUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-2 font-bold text-xs',
                'rounded-neo border-3 border-neo-black transition-all',
                copied
                  ? 'bg-neo-lime text-neo-black shadow-none'
                  : 'bg-neo-white/10 text-neo-white shadow-hard hover:shadow-hard-lg active:shadow-none'
              )}
              aria-label={copied ? t('referralDashboard.copied') : t('common.copy')}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? t('referralDashboard.copied') : t('common.copy')}
            </button>
          </div>

          {/* Share buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleShare('whatsapp')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-10',
                'bg-brand-whatsapp hover:bg-brand-whatsapp-hover text-white font-bold text-sm',
                'rounded-neo border-3 border-neo-black shadow-hard',
                'transition-shadow hover:shadow-hard-lg active:shadow-none'
              )}
              aria-label={t('referralDashboard.shareVia') + ' WhatsApp'}
            >
              <WhatsAppIcon className="w-4 h-4" />
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => handleShare('native')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 h-10',
                'bg-neo-pink hover:bg-neo-pink/90 text-white font-bold text-sm',
                'rounded-neo border-3 border-neo-black shadow-hard',
                'transition-shadow hover:shadow-hard-lg active:shadow-none'
              )}
              aria-label={t('common.share')}
            >
              <Share2 className="w-4 h-4" aria-hidden="true" />
              {t('common.share')}
            </button>
          </div>
        </m.div>

        {/* Invite more CTA */}
        {data.referrals.length > 0 && data.totalJoined < 50 && (
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.32 }}
            className="text-center text-sm font-bold text-neo-pink"
          >
            {t('referralDashboard.inviteMore')}
          </m.p>
        )}

        {/* Recent referrals list */}
        <ReferralList referrals={data.referrals} />
      </div>
    </div>
  );
}
