'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  LayoutGrid,
  Package,
  Crown,
  Sparkles,
  PencilRuler,
  Zap,
  Users,
  TrendingUp,
} from 'lucide-react';
import { m, useMotionValue, useTransform, animate, useInView } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import Header from '@/components/Header';

const BoardGallery = dynamic(
  () => import('@/components/ugc/BoardGallery'),
  { ssr: false }
);
const WordPackGallery = dynamic(
  () => import('@/components/ugc/WordPackGallery'),
  { ssr: false }
);
const UGCFeaturedStrip = dynamic(
  () => import('@/components/ugc/UGCFeaturedStrip'),
  { ssr: false }
);
const CreatorLeaderboard = dynamic(
  () => import('@/components/ugc/CreatorLeaderboard'),
  { ssr: false }
);

type Tab = 'boards' | 'packs' | 'creators';

const TAB_CONFIG: { key: Tab; icon: typeof LayoutGrid; labelKey: string }[] = [
  { key: 'boards', icon: LayoutGrid, labelKey: 'ugc.community.tabBoards' },
  { key: 'packs', icon: Package, labelKey: 'ugc.community.tabPacks' },
  { key: 'creators', icon: Crown, labelKey: 'ugc.community.tabCreators' },
];

/* ── Community stats hook ─────────────────────────────────────── */
interface CommunityStats {
  totalBoards: number;
  totalCreators: number;
  totalPlays: number;
}

function useCommunityStats() {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/ugc/boards/gallery?sort=featured&page=1&limit=1');
        if (!res.ok) return;
        const data = await res.json();
        if (data.total != null) {
          setStats({
            totalBoards: data.total ?? 0,
            totalCreators: data.totalCreators ?? 0,
            totalPlays: data.totalPlays ?? 0,
          });
        }
      } catch {
        // Silent — stats are decorative
      }
    })();
  }, []);

  return stats;
}

/* ── Animated number counter ──────────────────────────────────── */
function AnimatedCounter({ target, delay = 0 }: { target: number; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduceMotion = useShouldReduceMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  const [display, setDisplay] = useState('0');

  useEffect(() => {
    const unsubscribe = rounded.on('change', (v) => setDisplay(v));
    return unsubscribe;
  }, [rounded]);

  useEffect(() => {
    if (!isInView) return;
    if (reduceMotion) {
      count.set(target);
      return;
    }
    const controls = animate(count, target, {
      duration: 1.6,
      delay,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [isInView, target, delay, count, reduceMotion]);

  return (
    <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {display}
    </span>
  );
}

/* ── Stat pill with counter ───────────────────────────────────── */
function StatPill({
  icon: Icon,
  value,
  labelKey,
  delay,
}: {
  icon: typeof Users;
  value: number;
  labelKey: string;
  delay: number;
}) {
  const { t } = useLanguage();
  if (!value) return null;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 400, damping: 22 }}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5',
        'bg-neo-white/5 border border-neo-white/10 rounded-neo',
        'text-neo-white font-neo-body text-xs'
      )}
    >
      <Icon className="w-3.5 h-3.5 text-neo-cyan" />
      <span className="font-bold text-neo-white">
        <AnimatedCounter target={value} delay={delay} />
      </span>
      <span className="hidden sm:inline">{t(labelKey)}</span>
    </AdaptiveMotion.div>
  );
}

/* ── Main page ────────────────────────────────────────────────── */
export default function CommunityPageClient() {
  const { t, dir, language } = useLanguage();
  const router = useRouter();
  const goBack = useBackOneLevel();
  const [activeTab, setActiveTab] = useState<Tab>('boards');
  const stats = useCommunityStats();

  const handleNavigatePlay = useCallback(
    (boardCode: string) => {
      router.push(`/${language}/community/${boardCode}`);
    },
    [router, language]
  );

  return (
    <div className="min-h-screen bg-neo-navy relative overflow-hidden">
      <Header />

      {/* ── Background texture — diagonal scan lines ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent, transparent 4px, currentColor 4px, currentColor 5px)',
        }}
      />

      <div className="relative z-10 p-4 pb-28 max-w-5xl mx-auto">
        {/* ── Back button ── */}
        <AdaptiveMotion.button
          onClick={goBack}
          initial={{ opacity: 0, x: dir === 'rtl' ? 12 : -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'flex items-center gap-1.5 mb-6 px-3 py-1.5',
            'text-neo-white hover:text-neo-white',
            'font-neo-body text-sm transition-colors'
          )}
        >
          <ArrowLeft className={cn('w-4 h-4', dir === 'rtl' && 'rotate-180')} />
          {t('common.back')}
        </AdaptiveMotion.button>

        {/* ═══════════════════════════════════════════════
            HERO SECTION — dramatic title + animated stats
            ═══════════════════════════════════════════════ */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 text-center"
        >
          {/* Glowing icon cluster */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="relative">
              <Sparkles className="w-7 h-7 text-neo-pink" />
              <span className="absolute inset-0 blur-lg bg-neo-pink/30 rounded-full" />
            </span>
            <h1 className="font-neo-display font-bold text-3xl sm:text-4xl text-neo-white tracking-tight">
              {t('ugc.community.title')}
            </h1>
            <span className="relative">
              <Zap className="w-6 h-6 text-neo-yellow" />
              <span className="absolute inset-0 blur-lg bg-neo-yellow/30 rounded-full" />
            </span>
          </div>

          <p className="text-neo-white font-neo-body text-sm max-w-md mx-auto mb-5">
            {t('ugc.community.subtitle')}
          </p>

          {/* Community stats bar — numbers count up */}
          {stats && (
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <StatPill
                icon={LayoutGrid}
                value={stats.totalBoards}
                labelKey="ugc.community.statBoards"
                delay={0.2}
              />
              <StatPill
                icon={Users}
                value={stats.totalCreators}
                labelKey="ugc.community.statCreators"
                delay={0.3}
              />
              <StatPill
                icon={TrendingUp}
                value={stats.totalPlays}
                labelKey="ugc.community.statPlays"
                delay={0.4}
              />
            </div>
          )}
        </AdaptiveMotion.div>

        {/* ═══════════════════════════════════════════════
            FEATURED SPOTLIGHT — full-width hero cards
            ═══════════════════════════════════════════════ */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'mb-8 p-4 rounded-neo',
            'border-2 border-neo-yellow/20',
            'bg-linear-to-br from-neo-yellow/4 via-transparent to-neo-pink/4'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 rounded-full bg-neo-yellow" />
            <h2 className="font-neo-display font-bold text-sm text-neo-yellow uppercase tracking-wider">
              {t('ugc.strip.featured')}
            </h2>
          </div>
          <UGCFeaturedStrip
            sort="featured"
            limit={3}
            variant="default"
            showCreateCTA={false}
            showViewAll={false}
            minToShow={1}
          />
        </AdaptiveMotion.div>

        {/* ═══════════════════════════════════════════════
            TAB BAR — with sliding layoutId indicator
            ═══════════════════════════════════════════════ */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className={cn(
            'flex p-1 mb-8 overflow-x-auto scrollbar-hide',
            'bg-neo-white/3 border-2 border-neo-white/10 rounded-neo'
          )}
          role="tablist"
        >
          {TAB_CONFIG.map(({ key, icon: Icon, labelKey }) => (
            <button
              type="button"
              key={key}
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5',
                'font-neo-display font-bold text-sm whitespace-nowrap',
                'rounded-[3px] transition-colors duration-150 z-10',
                activeTab === key
                  ? 'text-black'
                  : 'text-neo-white hover:text-neo-white'
              )}
            >
              {/* Sliding background indicator */}
              {activeTab === key && (
                <m.div
                  layoutId="community-tab-indicator"
                  className="absolute inset-0 bg-neo-lime border-2 border-black rounded-[3px] shadow-hard-sm"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  style={{ zIndex: -1 }}
                />
              )}
              <Icon className="w-4 h-4" />
              {t(labelKey)}
            </button>
          ))}
        </AdaptiveMotion.div>

        {/* ═══════════════════════════════════════════════
            TAB CONTENT — crossfade on switch
            ═══════════════════════════════════════════════ */}
        <AdaptiveMotion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeTab === 'boards' && <BoardGallery onPlay={handleNavigatePlay} />}
          {activeTab === 'packs' && <WordPackGallery />}
          {activeTab === 'creators' && <CreatorLeaderboard />}
        </AdaptiveMotion.div>
      </div>

      {/* ═══════════════════════════════════════════════
          FLOATING CREATE CTA — spring entrance + subtle pulse
          ═══════════════════════════════════════════════ */}
      <div className="fixed bottom-(--mobile-bottom-safe) sm:bottom-6 inset-x-0 z-30 flex justify-center pointer-events-none">
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 350, damping: 22 }}
          className="pointer-events-auto"
        >
          <Link
            href={`/${language}/create/board`}
            className={cn(
              'group relative flex items-center gap-2.5 px-5 py-3',
              'bg-neo-pink text-white font-neo-display font-bold text-sm',
              'border-3 border-black rounded-neo shadow-hard-lg',
              'hover:shadow-hard hover:-translate-y-0.5',
              'active:shadow-hard-pressed active:translate-y-0',
              'transition-all duration-150'
            )}
          >
            {/* Attention pulse ring */}
            <span className="absolute inset-0 rounded-neo border-2 border-neo-pink/50 animate-ping opacity-30 pointer-events-none" />
            <PencilRuler className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200" />
            {t('ugc.strip.createOwn')}
          </Link>
        </AdaptiveMotion.div>
      </div>
    </div>
  );
}
