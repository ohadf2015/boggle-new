import { NextRequest, NextResponse } from 'next/server'
import { getLemonSqueezyClient } from '@/lib/lemonsqueezy'

export async function POST(req: NextRequest) {
  try {
    const { tier, userId, email } = await req.json()

    if (!tier || tier !== 'pro') {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const client = getLemonSqueezyClient()
    const checkoutUrl = await client.createCheckout({
      userId: userId || 'anonymous',
      tier: 'pro',
      email: email ?? undefined,
      redirectUrl: `${req.nextUrl.origin}/teacher?checkout=success`,
    })

    return NextResponse.json({ url: checkoutUrl })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}