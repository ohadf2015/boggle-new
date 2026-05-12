'use client'
import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import InsightCard, { type InsightIcon } from './InsightCard'

interface InsightData {
  type: string
  headlineKey: string
  subKey: string
  subParams?: Record<string, string | number>
  lucideIcon: InsightIcon
}

interface Props {
  mode: 'word_hunt' | 'word_wheel' | 'puzzle'
  date: string
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ''))
}

export default function DailyInsightStack({ mode, date }: Props) {
  const { t } = useLanguage()
  const [insights, setInsights] = useState<InsightData[]>([])

  useEffect(() => {
    fetch(`/api/daily/insights?mode=${mode}&date=${encodeURIComponent(date)}`)
      .then(r => r.json())
      .then(({ insights: data }) => setInsights((data ?? []).slice(0, 3)))
      .catch(() => {})
  }, [mode, date])

  if (!insights.length) return null

  return (
    <div className="mb-4">
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {insights.map((insight, i) => (
          <div key={`${insight.type}-${i}`} data-testid="insight-card">
            <InsightCard
              type={insight.type}
              headline={t(insight.headlineKey)}
              sub={insight.subParams ? interpolate(t(insight.subKey), insight.subParams) : t(insight.subKey)}
              lucideIcon={insight.lucideIcon}
              index={i}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
