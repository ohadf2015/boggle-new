'use client';

import React, { useCallback } from 'react';
import { m } from 'framer-motion';
import { Trophy, Flame, Zap, BookOpen, Gamepad2, Type, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePersonalRecords, type PersonalRecord } from '@/hooks/usePersonalRecords';

const ICON_MAP: Record<string, React.ReactNode> = {
  text: <Type className="w-5 h-5" />,
  flame: <Flame className="w-5 h-5" />,
  zap: <Zap className="w-5 h-5" />,
  book: <BookOpen className="w-5 h-5" />,
  trophy: <Trophy className="w-5 h-5" />,
  gamepad: <Gamepad2 className="w-5 h-5" />,
};

function RecordCard({ record, onShare }: { record: PersonalRecord; onShare: () => void }) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        'bg-neo-navy-light border border-white/[0.08] rounded-neo-xl p-4',
        'flex flex-col gap-2'
      )}
    >
      <div className="flex items-center gap-2 text-neo-cyan">
        {ICON_MAP[record.icon] || <Trophy className="w-5 h-5" />}
        <span className="text-xs font-bold uppercase tracking-wide text-neo-white">
          {t(record.label)}
        </span>
      </div>
      <div className="text-2xl font-black text-neo-white">{String(record.value)}</div>
      {record.date && (
        <span className="text-[10px] text-neo-white">{record.date}</span>
      )}
      <button
        onClick={onShare}
        aria-label={t('profile.records.share')}
        className={cn(
          'mt-auto flex items-center gap-1 text-xs font-bold',
          'text-neo-cyan hover:text-neo-cyan/70 transition-colors',
          'self-end'
        )}
      >
        <Share2 className="w-3.5 h-3.5" />
        {t('profile.records.share')}
      </button>
    </div>
  );
}

export function PersonalRecords() {
  const { t } = useLanguage();
  const { records, isLoading } = usePersonalRecords();

  const handleShare = useCallback((record: PersonalRecord) => {
    const text = `${t(record.label)}: ${record.value} - LexiClash`;
    navigator.clipboard.writeText(text).catch(() => {});
  }, [t]);

  if (isLoading) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-lg font-black text-neo-white mb-3">
        {t('profile.records.title')}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {records.map((record) => (
          <RecordCard
            key={record.label}
            record={record}
            onShare={() => handleShare(record)}
          />
        ))}
      </div>
    </m.div>
  );
}

export default PersonalRecords;
