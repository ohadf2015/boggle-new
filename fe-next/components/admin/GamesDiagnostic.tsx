'use client';

import { useState } from 'react';
import { m } from 'framer-motion';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Database,
  Clock,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';

interface GamesDiagnosticProps {
  authToken: string;
}

export function GamesDiagnostic({ authToken }: GamesDiagnosticProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostic = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/games-diagnostic', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-neo-display text-neo-white flex items-center gap-2">
          <Database className="w-5 h-5 text-neo-cyan" />
          Database Diagnostic Tool
        </h3>
        <Button
          onClick={runDiagnostic}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          {loading ? (
            <Loader size="sm" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Run Diagnostic
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/30 border-neo border-red-500 rounded-neo p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-neo-display text-red-300 mb-1">Error</div>
              <div className="text-sm text-red-200">{error}</div>
            </div>
          </div>
        </div>
      )}

      {data && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Summary */}
          <div className={cn(
            "border-neo rounded-neo p-4",
            data.diagnostic.totals.todayGames > 0
              ? "bg-green-900/20 border-green-500"
              : "bg-yellow-900/20 border-yellow-500"
          )}>
            <div className="flex items-start gap-3">
              {data.diagnostic.totals.todayGames > 0 ? (
                <CheckCircle className="w-6 h-6 text-green-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-neo-display text-lg mb-2">
                  {data.interpretation.message}
                </div>
                {data.interpretation.recommendations.length > 0 && (
                  <ul className="space-y-1 text-sm">
                    {data.interpretation.recommendations.map((rec: string, idx: number) => (
                      <li key={`rec-${idx}-${rec}`} className="flex items-start gap-2">
                        <span className="text-yellow-400">→</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Timestamp Info */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={<Clock className="w-4 h-4" />}
              label="Server Time"
              value={new Date(data.diagnostic.timestamp).toLocaleString()}
            />
            <InfoCard
              icon={<Clock className="w-4 h-4" />}
              label="Local Time"
              value={data.diagnostic.localTime}
            />
            <InfoCard
              icon={<Info className="w-4 h-4" />}
              label="Server Timezone"
              value={data.diagnostic.serverTimeZone}
            />
            <InfoCard
              icon={<Info className="w-4 h-4" />}
              label="Database Timezone"
              value={data.diagnostic.databaseTimeZone}
            />
          </div>

          {/* Totals */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Today's Games"
              value={data.diagnostic.totals.todayGames}
              trend="positive"
            />
            <StatCard
              label="All-Time Games"
              value={data.diagnostic.totals.allTimeGames}
              trend="neutral"
            />
          </div>

          {/* Tables Breakdown */}
          <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
            <h4 className="font-neo-display text-neo-white mb-3">Database Tables</h4>
            <div className="space-y-3">
              {Object.entries(data.diagnostic.tables).map(([tableName, tableData]: [string, any]) => (
                <TableCard key={tableName} tableName={tableName} data={tableData} />
              ))}
            </div>
          </div>

          {/* Server Info */}
          {data.diagnostic.serverInfo && (
            <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
              <h4 className="font-neo-display text-neo-white mb-2">Server Info</h4>
              <div className="text-sm text-slate-300">
                Process Uptime: {data.diagnostic.serverInfo.processUptimeFormatted}
              </div>
            </div>
          )}
        </m.div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-3">
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm text-neo-white font-mono">{value}</div>
    </div>
  );
}

function StatCard({ label, value, trend }: { label: string; value: number; trend: 'positive' | 'neutral' }) {
  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-slate-400 text-sm mb-1">{label}</div>
          <div className="text-2xl font-neo-display text-neo-white">{value.toLocaleString()}</div>
        </div>
        {trend === 'positive' && value > 0 && (
          <TrendingUp className="w-5 h-5 text-green-400" />
        )}
      </div>
    </div>
  );
}

interface TableCardData {
  error?: string;
  todayCount?: number;
  allTimeCount?: number;
  recentGames?: Array<{
    id?: string;
    created_at?: string;
    started_at?: string;
    completed_at?: string;
  }>;
}

function TableCard({ tableName, data }: { tableName: string; data: TableCardData }) {
  if (data.error) {
    return (
      <div className="border-neo border-red-500/30 rounded p-3 bg-red-900/10">
        <div className="font-mono text-sm text-red-300 mb-1">{tableName}</div>
        <div className="text-xs text-red-400">Error: {data.error}</div>
      </div>
    );
  }

  return (
    <div className="border-neo border-slate-600 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-sm text-neo-white">{tableName}</div>
        <div className="text-xs text-slate-400">
          Today: <span className="text-neo-cyan font-bold">{data.todayCount}</span> /
          All-time: <span className="text-slate-300">{data.allTimeCount}</span>
        </div>
      </div>

      {data.recentGames && data.recentGames.length > 0 && (
        <div className="mt-2 border-t border-slate-700 pt-2">
          <div className="text-xs text-slate-500 mb-1">Recent games (latest 5):</div>
          <div className="space-y-1">
            {data.recentGames.slice(0, 3).map((game, idx) => (
              <div key={`game-${game.id ?? idx}`} className="text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>{game.id?.substring(0, 8)}...</span>
                <span className="text-slate-500">
                  {(() => {
                    const ts = game.created_at || game.started_at || game.completed_at;
                    return ts ? new Date(ts).toLocaleTimeString() : '—';
                  })()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default GamesDiagnostic;
