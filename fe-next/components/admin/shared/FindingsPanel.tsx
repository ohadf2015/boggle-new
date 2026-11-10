'use client';

import { AlertTriangle, Radar, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Finding, FindingTone } from '@/lib/admin/findings';
import { MUTED, PANEL } from './panelStyles';

const TONE: Record<FindingTone, { icon: LucideIcon; ring: string; text: string }> = {
  win: { icon: TrendingUp, ring: 'border-neo-lime', text: 'text-neo-lime' },
  problem: { icon: AlertTriangle, ring: 'border-neo-red', text: 'text-neo-red' },
  early: { icon: Radar, ring: 'border-neo-orange', text: 'text-neo-orange' },
  fact: { icon: Sparkles, ring: 'border-neo-cyan', text: 'text-neo-cyan' },
};

export interface FindingDrill {
  kind: 'teachers' | 'classes';
  ids: string[];
  title: string;
}

interface Props {
  findings: Finding[];
  /** The plain-language sentence for a finding. */
  describe: (f: Finding) => string;
  /** Without it, findings that carry ids render as plain text. */
  onDrill?: (d: FindingDrill) => void;
  testId?: string;
}

function Column({ testId, title, empty, items, describe, onDrill }: { testId: string; title: string; empty: string; items: Finding[] } & Pick<Props, 'describe' | 'onDrill'>) {
  const { t } = useLanguage();
  return (
    <section data-testid={testId} className={`${PANEL} space-y-2`}>
      <h3 className="text-sm font-semibold text-neo-cream">{title}</h3>
      {items.length === 0 ? (
        <p className={`text-sm ${MUTED}`}>{empty}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((f) => {
            const { icon: Icon, ring, text } = TONE[f.tone];
            const { drill } = f;
            const message = describe(f);
            return (
              <li key={f.id} data-testid={`finding-${f.id}`} className={`flex items-start gap-2 rounded border-s-4 ps-2 ${ring}`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${text}`} aria-hidden="true" />
                <div className="min-w-0 text-sm text-neo-cream">
                  <p>{message}</p>
                  {drill && drill.ids.length > 0 && onDrill && (
                    <button
                      type="button"
                      onClick={() => onDrill({ ...drill, title: message })}
                      className="text-xs font-semibold text-neo-cyan underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-neo-cyan"
                    >
                      {t('admin.findings.show', 'Show them ({count})', { count: drill.ids.length })}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Early warnings on top, then what is working and what is not, then fun facts. */
export function FindingsPanel({ findings, describe, onDrill, testId = 'findings' }: Props) {
  const { t } = useLanguage();
  const by = (tone: FindingTone) => findings.filter((f) => f.tone === tone);
  const facts = by('fact');
  const shared = { describe, onDrill };
  return (
    <div className="space-y-3" data-testid={testId}>
      <Column
        testId="findings-early"
        title={t('admin.findings.earlyTitle', 'Early warnings: likely to become problems')}
        empty={t('admin.findings.earlyNone', 'No early warning signs. Nothing is slipping yet.')}
        items={by('early')}
        {...shared}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Column
          testId="findings-working"
          title={t('admin.findings.workingTitle', 'What is working')}
          empty={t('admin.findings.workingNone', 'No clear win yet. Nothing is trending up enough to call.')}
          items={by('win')}
          {...shared}
        />
        <Column
          testId="findings-broken"
          title={t('admin.findings.brokenTitle', 'What is not working')}
          empty={t('admin.findings.brokenNone', 'Nothing is breaking right now.')}
          items={by('problem')}
          {...shared}
        />
      </div>
      {facts.length > 0 && (
        <ul data-testid="findings-facts" className="flex flex-wrap gap-2">
          {facts.map((f) => (
            <li key={f.id} className={`flex items-center gap-2 rounded-full border-2 px-3 py-1 text-xs text-neo-cream ${TONE.fact.ring}`}>
              <Sparkles className={`h-3.5 w-3.5 ${TONE.fact.text}`} aria-hidden="true" />
              {describe(f)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
