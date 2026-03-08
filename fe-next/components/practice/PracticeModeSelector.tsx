'use client';

import { useLanguage } from '@/contexts/LanguageContext';
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
        return 'text-neo-white/60';
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
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-neo-white/70 hover:text-neo-white hover:bg-neo-white/10"
          >
            <ArrowLeft className={cn('w-5 h-5', isRTL && 'rotate-180')} />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-neo-display text-neo-white">
              {t('education.practice.title')}
            </h1>
            <p className="text-sm text-neo-white/60">{lessonName}</p>
          </div>
        </div>

        {/* Lesson Stats */}
        <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/80 mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-neo-display text-neo-white">{wordCount}</p>
                  <p className="text-xs text-neo-white/60">
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

        {/* Practice Mode Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {practiceOptions.map((option) => (
            <Card
              key={option.type}
              onClick={() => onSelectMode(option.type)}
              className={cn(
                'border-neo border-neo-black shadow-hard cursor-pointer',
                'transition-all hover:shadow-hard-lg hover:-translate-y-1',
                option.bgClass
              )}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={cn('p-3 rounded-neo bg-neo-black/20', option.colorClass)}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={cn('text-lg font-neo-display', option.colorClass)}>
                      {t(getTranslationKey(option.type, 'title')) || option.type}
                    </h3>
                    <p className="text-sm text-neo-white/60 mt-1">
                      {t(getTranslationKey(option.type, 'desc')) || ''}
                    </p>
                    {getSessionCount(option.type) > 0 && (
                      <p className="text-xs text-neo-white/40 mt-2">
                        {getSessionCount(option.type)} {t('education.practice.sessionsCompleted')}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
