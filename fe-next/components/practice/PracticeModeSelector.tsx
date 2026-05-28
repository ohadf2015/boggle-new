'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Layers,
  Grid3X3,
  List,
  Zap,
  ArrowLeft,
  CheckCircle,
  Clock,
  Target,
  Shuffle,
  PenLine,
  Timer
} from 'lucide-react';
import type { PracticeType, MasteryLevel } from '@/hooks/usePracticeSession';

interface PracticeModeOption {
  type: PracticeType;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

interface PracticeModeSelectorProps {
  lessonName: string;
  wordCount: number;
  progress: {
    mastery: MasteryLevel;
    progress: {
      flashcard_sessions: number;
      solo_board_sessions: number;
      warmup_sessions: number;
      word_list_views: number;
      matching_sessions: number;
      spelling_sessions: number;
      blitz_sessions: number;
    } | null;
  };
  onSelectMode: (mode: PracticeType) => void;
  onBack: () => void;
}

export default function PracticeModeSelector({
  lessonName,
  wordCount,
  progress,
  onSelectMode,
  onBack,
}: PracticeModeSelectorProps) {
  const mastery = progress.mastery;
  const sessionsCompleted = progress.progress
    ? {
        flashcard: progress.progress.flashcard_sessions,
        solo_board: progress.progress.solo_board_sessions,
        warmup: progress.progress.warmup_sessions,
        word_list: progress.progress.word_list_views,
        matching: progress.progress.matching_sessions,
        spelling: progress.progress.spelling_sessions,
        blitz: progress.progress.blitz_sessions,
      }
    : { flashcard: 0, solo_board: 0, warmup: 0, word_list: 0, matching: 0, spelling: 0, blitz: 0 };
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const practiceOptions: PracticeModeOption[] = [
    {
      type: 'flashcard',
      icon: <Layers className="w-8 h-8" />,
      colorClass: 'text-neo-cyan',
      bgClass: 'bg-neo-cyan/10 hover:bg-neo-cyan/20',
    },
    {
      type: 'solo_board',
      icon: <Grid3X3 className="w-8 h-8" />,
      colorClass: 'text-neo-orange',
      bgClass: 'bg-neo-orange/10 hover:bg-neo-orange/20',
    },
    {
      type: 'word_list',
      icon: <List className="w-8 h-8" />,
      colorClass: 'text-neo-yellow',
      bgClass: 'bg-neo-yellow/10 hover:bg-neo-yellow/20',
    },
    {
      type: 'warmup',
      icon: <Zap className="w-8 h-8" />,
      colorClass: 'text-neo-pink',
      bgClass: 'bg-neo-pink/10 hover:bg-neo-pink/20',
    },
    {
      type: 'matching',
      icon: <Shuffle className="w-8 h-8" />,
      colorClass: 'text-neo-cyan',
      bgClass: 'bg-neo-cyan/10 hover:bg-neo-cyan/20',
    },
    {
      type: 'spelling',
      icon: <PenLine className="w-8 h-8" />,
      colorClass: 'text-neo-purple',
      bgClass: 'bg-neo-purple/10 hover:bg-neo-purple/20',
    },
    {
      type: 'blitz',
      icon: <Timer className="w-8 h-8" />,
      colorClass: 'text-neo-pink',
      bgClass: 'bg-neo-pink/10 hover:bg-neo-pink/20',
    },
  ];

  const getMasteryColor = (level: MasteryLevel) => {
    switch (level) {
      case 'mastered':
        return 'text-neo-cyan';
      case 'practicing':
        return 'text-neo-yellow';
      case 'started':
        return 'text-neo-orange';
      default:
        return 'text-neo-white';
    }
  };

  const getMasteryIcon = (level: MasteryLevel) => {
    switch (level) {
      case 'mastered':
        return <CheckCircle className="w-5 h-5" />;
      case 'practicing':
        return <Clock className="w-5 h-5" />;
      case 'started':
        return <Target className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getTranslationKey = (type: PracticeType, key: 'title' | 'desc') => {
    const map: Record<PracticeType, { title: string; desc: string }> = {
      flashcard: { title: 'education.practice.flashcards', desc: 'education.practice.flashcardsDesc' },
      solo_board: { title: 'education.practice.soloBoard', desc: 'education.practice.soloBoardDesc' },
      word_list: { title: 'education.practice.wordList', desc: 'education.practice.wordListDesc' },
      warmup: { title: 'education.practice.warmup', desc: 'education.practice.warmupDesc' },
      matching: { title: 'education.practice.matching', desc: 'education.practice.matchingDesc' },
      spelling: { title: 'education.practice.spelling', desc: 'education.practice.spellingDesc' },
      blitz: { title: 'education.practice.blitz', desc: 'education.practice.blitzDesc' },
    };
    return map[type][key];
  };

  const getSessionCount = (type: PracticeType) => {
    return sessionsCompleted[type] || 0;
  };

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <AdaptiveMotion.div
          className="flex items-center gap-4 mb-6"
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            aria-label={t('common.back')}
            className="text-neo-white hover:text-neo-white hover:bg-neo-white/10"
          >
            <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-neo-display text-neo-white">
              {t('education.practice.title')}
            </h1>
            <p className="text-sm text-neo-white">{lessonName}</p>
          </div>
        </AdaptiveMotion.div>

        {/* Lesson Stats */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 24, delay: 0.05 }}
        >
          <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-neo-display text-neo-white">{wordCount}</p>
                    <p className="text-xs text-neo-white">
                      {t('education.practice.wordCount')}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-neo-black/30" />
                  <div className={cn('flex items-center gap-2', getMasteryColor(mastery))}>
                    {getMasteryIcon(mastery)}
                    <span className="font-neo-body font-bold">
                      {t(`education.practice.mastery.${mastery}`) || mastery}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </AdaptiveMotion.div>

        {/* Practice Mode Options */}
        <AdaptiveMotion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07, delayChildren: 0.12 } },
          }}
        >
          {practiceOptions.map((option, index) => {
            const cardTilt = index % 2 === 0 ? -0.6 : 0.6;
            const solidBgMap: Record<string, string> = {
              'bg-neo-cyan/10 hover:bg-neo-cyan/20': 'bg-neo-cyan',
              'bg-neo-orange/10 hover:bg-neo-orange/20': 'bg-neo-orange',
              'bg-neo-yellow/10 hover:bg-neo-yellow/20': 'bg-neo-yellow',
              'bg-neo-pink/10 hover:bg-neo-pink/20': 'bg-neo-pink',
              'bg-neo-purple/10 hover:bg-neo-purple/20': 'bg-neo-purple',
            };
            const solidBg = solidBgMap[option.bgClass] || 'bg-neo-cyan';
            const sessions = getSessionCount(option.type);

            return (
              <AdaptiveMotion.div
                key={option.type}
                variants={{
                  hidden: { opacity: 0, y: 28, scale: 0.92, rotate: cardTilt * 3 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    rotate: cardTilt,
                    transition: { type: 'spring', stiffness: 420, damping: 18 },
                  },
                }}
                whileHover={{
                  y: -6,
                  rotate: 0,
                  scale: 1.03,
                  boxShadow: '8px 8px 0px black',
                  transition: { type: 'spring', stiffness: 400, damping: 20 },
                }}
                whileTap={{
                  scale: 0.96,
                  y: 2,
                  boxShadow: '2px 2px 0px black',
                  transition: { duration: 0.08 },
                }}
                onClick={() => onSelectMode(option.type)}
                className={cn(
                  'relative rounded-neo border-3 border-black shadow-hard cursor-pointer overflow-hidden',
                  solidBg,
                )}
              >
                {/* Top accent stripe */}
                <div className="h-1.5 bg-black/20" />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <AdaptiveMotion.div
                      className="w-14 h-14 rounded-neo border-2 border-black bg-black/20 flex items-center justify-center shadow-hard-sm shrink-0"
                      animate={{ rotate: [0, -5, 5, -3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 + index * 0.5, ease: 'easeInOut' }}
                    >
                      <div className="text-black">{option.icon}</div>
                    </AdaptiveMotion.div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-neo-display font-black text-black uppercase">
                        {t(getTranslationKey(option.type, 'title')) || option.type}
                      </h3>
                      <p className="text-sm font-neo-body font-bold text-black/60 mt-0.5">
                        {t(getTranslationKey(option.type, 'desc')) || ''}
                      </p>
                      {sessions > 0 && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-black/15 rounded-neo text-xs font-black text-black/70">
                          <CheckCircle className="w-3 h-3" />
                          {sessions} {t('education.practice.sessionsCompleted')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </AdaptiveMotion.div>
            );
          })}
        </AdaptiveMotion.div>
      </div>
    </div>
  );
}
