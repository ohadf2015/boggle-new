'use client';

/**
 * BotWordsSection - Display bot words in collapsible section
 *
 * Shows each bot's found words with BotWordCard component.
 */

import React from 'react';
import { Bot } from 'lucide-react';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { BotWordCard } from './BotWordCard';
import type { BotWordDetail } from '../useResultsData';

interface BotWordsSectionProps {
  botWordDetails: BotWordDetail[];
  language: string;
  title?: string;
  t: (key: string) => string | undefined;
  defaultExpanded?: boolean;
}

export function BotWordsSection({
  botWordDetails,
  language,
  title,
  t,
  defaultExpanded = false,
}: BotWordsSectionProps): React.ReactElement {
  const totalWords = botWordDetails.reduce((sum, bot) => sum + bot.totalWords, 0);

  return (
    <CollapsibleSection
      title={title}
      icon={<Bot className="w-4 h-4" />}
      badge={totalWords}
      defaultExpanded={defaultExpanded}
      variant="tertiary"
      className="shadow-hard"
    >
      <div className="space-y-3">
        {botWordDetails.map((bot) => (
          <BotWordCard key={bot.name} bot={bot} language={language} t={t} />
        ))}
      </div>
    </CollapsibleSection>
  );
}
