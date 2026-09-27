'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Database, HardDrive, Clock } from 'lucide-react';

interface HealthData {
  redis: 'ok' | 'down';
  database: 'ok' | 'down';
  process: { heapMB: number; uptimeSeconds: number };
}

interface SystemHealthProps {
  health: HealthData | null;
}

function formatUptime(seconds: number): string {
  if (seconds >= 86400) return `${Math.floor(seconds / 86400)}d`;
  if (seconds >= 3600) return `${Math.floor(seconds / 3600)}h`;
  if (seconds >= 60) return `${Math.floor(seconds / 60)}m`;
  return `${seconds}s`;
}

export function SystemHealth({ health }: SystemHealthProps) {
  const { t } = useLanguage();

  if (!health) {
    return (
      <div data-testid="health-loading" className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 animate-pulse h-20" />
    );
  }

  const services = [
    { name: 'Redis', status: health.redis, icon: HardDrive },
    { name: 'Database', status: health.database, icon: Database },
  ];

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {services.map((svc) => {
            const Icon = svc.icon;
            const isOk = svc.status === 'ok';
            return (
              <div key={svc.name} className="flex items-center gap-2">
                <div className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  isOk ? 'bg-emerald-400' : 'bg-red-500 animate-pulse'
                )} />
                <Icon className="w-4 h-4 text-slate-400" />
                <span className="text-sm text-slate-300">{svc.name}</span>
                <span className={cn(
                  'text-xs font-medium px-1.5 py-0.5 rounded',
                  isOk ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                )}>
                  {isOk ? t('admin.system.ok') : t('admin.system.down')}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>Heap: {health.process.heapMB}MB</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatUptime(health.process.uptimeSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}
