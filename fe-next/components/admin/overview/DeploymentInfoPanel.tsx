'use client';

import { useEffect, useState } from 'react';
import { Rocket, GitBranch, ExternalLink, GitCommit } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ChangelogCommit {
  sha: string;
  shortSha: string;
  subject: string;
  author: string;
  date: string;
}

interface DeploymentInfo {
  latest: {
    sha: string | null;
    shortSha: string | null;
    subject: string | null;
    author: string | null;
    branch: string | null;
    deploymentId: string | null;
    githubUrl: string | null;
    deployedAt: string | null;
    source: 'railway' | 'changelog' | 'unknown';
  };
  recent: ChangelogCommit[];
  builtAt: string | null;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DeploymentInfoPanel({ authToken }: { authToken: string }) {
  const { t } = useLanguage();
  const [data, setData] = useState<DeploymentInfo | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    fetch('/api/admin/deployment-info', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        const body = await res.json();
        if (!cancelled) setData(body.data as DeploymentInfo);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  return (
    <div className="bg-neo-navy-light/50 rounded-neo border-neo border-black p-4 mb-6">
      <h3 className="text-sm font-neo-display text-neo-white flex items-center gap-2 mb-3">
        <Rocket className="w-4 h-4 text-neo-lime" />
        {t('admin.deployment.title')}
      </h3>

      {error ? (
        <p className="text-sm text-neo-red">{t('admin.deployment.error')}</p>
      ) : data === null ? (
        <div
          data-testid="deployment-info-skeleton"
          className="bg-neo-navy-elevated/30 rounded animate-pulse h-32"
        />
      ) : (
        <>
          {/* Live headline — what is running right now */}
          <div className="rounded-neo border-neo border-black bg-neo-navy/60 p-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {data.latest.source === 'railway' && (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded bg-neo-lime text-black">
                  {t('admin.deployment.live')}
                </span>
              )}
              {data.latest.shortSha && (
                <code className="text-xs font-mono text-neo-cyan">{data.latest.shortSha}</code>
              )}
              {data.latest.branch && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-neo-navy-elevated text-neo-white/80">
                  <GitBranch className="w-3 h-3" />
                  {data.latest.branch}
                </span>
              )}
            </div>

            <p className="text-sm text-neo-white font-neo-body leading-snug">
              {data.latest.subject ?? t('admin.deployment.unknown')}
            </p>

            <div className="flex items-center gap-2 flex-wrap mt-2 text-[11px] text-neo-white/60">
              {data.latest.author && (
                <span>
                  {t('admin.deployment.by')} {data.latest.author}
                </span>
              )}
              {data.latest.deployedAt && (
                <span>
                  · {t('admin.deployment.deployed')} {formatWhen(data.latest.deployedAt)}
                </span>
              )}
              {data.latest.githubUrl && (
                <a
                  href={data.latest.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-neo-cyan hover:underline"
                >
                  {t('admin.deployment.viewCommit')}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>

          {/* Recent changes */}
          {data.recent.length > 0 && (
            <div>
              <h4 className="text-xs font-neo-display text-neo-white/70 mb-2">
                {t('admin.deployment.recent')}
              </h4>
              <ul className="space-y-1.5">
                {data.recent.map((c) => {
                  const isLive = !!data.latest.sha && c.sha === data.latest.sha;
                  return (
                    <li key={c.sha} className="flex items-start gap-2 text-xs">
                      <GitCommit
                        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                          isLive ? 'text-neo-lime' : 'text-neo-white/40'
                        }`}
                      />
                      <code className="font-mono text-neo-cyan/80 shrink-0">{c.shortSha}</code>
                      <span className="text-neo-white/85 leading-snug flex-1 min-w-0">
                        {c.subject}
                        {isLive && (
                          <span className="ml-1 text-[10px] text-neo-lime">
                            ({t('admin.deployment.thisDeploy')})
                          </span>
                        )}
                      </span>
                      <span className="text-neo-white/40 shrink-0">{formatWhen(c.date)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {data.builtAt && (
            <p className="mt-3 text-[10px] text-neo-white/40">
              {t('admin.deployment.built')} {formatWhen(data.builtAt)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
