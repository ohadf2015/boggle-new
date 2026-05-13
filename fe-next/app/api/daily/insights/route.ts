import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface Insight {
  type: string
  headlineKey: string
  subKey: string
  subParams?: Record<string, string | number>
  lucideIcon: string
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode') ?? 'word_hunt'
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0]
  const insights: Insight[] = []

  if (mode === 'word_hunt') {
    const { data: today } = await supabase
      .from('daily_word_hunt_attempts').select('efficiency_score,solved,attempts_used')
      .eq('player_id', user.id).eq('puzzle_date', date).single()

    if (!today) return NextResponse.json({ insights: [] })

    const score = today.efficiency_score ?? 0

    // Personal best
    const { data: history } = await supabase
      .from('daily_word_hunt_attempts').select('efficiency_score')
      .eq('player_id', user.id).order('efficiency_score', { ascending: false }).limit(20)

    const prevBest = (history ?? [])
      .filter((r: { efficiency_score: number }) => r.efficiency_score !== score)
      .reduce((max: number, r: { efficiency_score: number }) => Math.max(max, r.efficiency_score ?? 0), 0)

    if (score > prevBest && prevBest > 0) {
      insights.push({ type: 'personal_best', headlineKey: 'daily.insights.personalBest.headline',
        subKey: 'daily.insights.personalBest.sub', subParams: { n: score - prevBest }, lucideIcon: 'Trophy' })
    }

    // First try
    if (today.solved && today.attempts_used === 1) {
      insights.push({ type: 'first_try', headlineKey: 'daily.insights.firstTry.headline',
        subKey: 'daily.insights.firstTry.sub', subParams: { n: 8 }, lucideIcon: 'Target' })
    }

    // Percentile vs all players today (top 20% only)
    const { data: peers } = await supabase
      .from('daily_word_hunt_attempts').select('efficiency_score')
      .eq('puzzle_date', date).limit(500)
    const peerScores = (peers ?? []).map((r: { efficiency_score: number }) => r.efficiency_score ?? 0)
    if (peerScores.length >= 5) {
      const below = peerScores.filter((s: number) => s < score).length
      const rankPct = Math.max(1, Math.round(100 - (below / peerScores.length) * 100))
      if (rankPct <= 20) {
        insights.push({ type: 'percentile', headlineKey: 'daily.insights.percentile.headline',
          subKey: 'daily.insights.percentile.sub', subParams: { n: rankPct }, lucideIcon: 'Zap' })
      }
    }

    // Speed vs 30-day average
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const { data: recent } = await supabase
      .from('daily_word_hunt_attempts').select('efficiency_score,puzzle_date')
      .eq('player_id', user.id).gte('puzzle_date', cutoff)
      .order('puzzle_date', { ascending: false })

    const prevAttempts = (recent ?? []).filter((r: { puzzle_date: string }) => r.puzzle_date !== date)
    const recentScores = prevAttempts.map((r: { efficiency_score: number }) => r.efficiency_score ?? 0)

    if (recentScores.length >= 3) {
      const avg = recentScores.reduce((a: number, b: number) => a + b, 0) / recentScores.length
      const delta = Math.round(((score - avg) / Math.max(1, avg)) * 100)
      if (delta > 10) {
        insights.push({ type: 'speed', headlineKey: 'daily.insights.speed.headline',
          subKey: 'daily.insights.speed.sub', subParams: { n: delta }, lucideIcon: 'Gauge' })
      } else if (score > (prevAttempts[0]?.efficiency_score ?? 0)) {
        insights.push({ type: 'improved', headlineKey: 'daily.insights.improved.headline',
          subKey: 'daily.insights.improved.sub', lucideIcon: 'TrendingUp' })
      }
    }
  }

  return NextResponse.json({ insights: insights.slice(0, 3) })
}
