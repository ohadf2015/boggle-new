import { NextRequest, NextResponse } from 'next/server'
import { getAuthedUser } from '@/lib/auth/getAuthedUser'
import { createAdminClient } from '@/utils/supabase/admin'
import logger from '@/utils/logger'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await request.json().catch(() => null)) as { questId?: unknown } | null
    const questId = typeof body?.questId === 'string' ? body.questId : ''
    if (!UUID.test(questId)) return NextResponse.json({ error: 'Invalid questId' }, { status: 400 })

    const supabase = createAdminClient()
    if (!supabase) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

    // Conditional update is the race guard: only the first caller matches a row.
    const { data, error } = await supabase
      .from('weekly_quests')
      .update({ celebrated: true })
      .eq('id', questId)
      .eq('player_id', user.id)
      .eq('completed', true)
      .eq('celebrated', false)
      .select('id')
    if (error) {
      logger.error('Weekly quest celebrate failed:', error.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    return NextResponse.json({ newlyCelebrated: (data?.length ?? 0) > 0 })
  } catch (error) {
    logger.error('Weekly quest celebrate error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
