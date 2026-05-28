'use client';

/**
 * VaultBadge Component
 * Small badge displayed on player profile showing vault completion.
 * Shows vault name, rank, and date.
 */

import React from 'react';
import { Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface VaultBadgeProps {
  vaultName: string;
  rank: number;
  date: string;
  className?: string;
}

const VaultBadge: React.FC<VaultBadgeProps> = ({
  vaultName,
  rank,
  date,
  className,
}) => {
  const { t } = useLanguage();

  return (
    <div
      data-testid="vault-badge"
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-neo',
        'border-2 border-neo-yellow bg-neo-navy/80',
        'shadow-hard-sm',
        className
      )}
    >
      <Shield size={16} className="text-neo-yellow shrink-0" />
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-neo-yellow truncate">
            {vaultName}
          </span>
          <span className="text-xs font-mono text-white font-bold">
            #{rank}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-white">
            {t('vault.badge')}
          </span>
          <span className="text-[10px] text-white">
            {date}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VaultBadge;
