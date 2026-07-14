'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import Link from 'next/link'

export default function PricingPage() {
  const { t } = useLanguage()
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(tier: 'pro') {
    setLoading(tier)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, userId: user?.id }),
      })
      if (!res.ok) throw new Error('Checkout failed')
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch {
      alert(t('pricing.error'))
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0b1a] text-white px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 font-fredoka">
          {t('pricing.title')}
        </h1>
        <p className="text-center text-gray-400 mb-12 text-lg">
          {t('pricing.subtitle')}
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Free Tier */}
          <div className="bg-[#1a1530] rounded-2xl p-8 border border-gray-800 flex flex-col">
            <h2 className="text-2xl font-bold font-fredoka mb-2">{t('pricing.free')}</h2>
            <p className="text-3xl font-bold mb-6">
              $0<span className="text-lg text-gray-400 font-normal">/{t('pricing.month')}</span>
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.free_1')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.free_2')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.free_3')}
              </li>
            </ul>
            <Link
              href={user ? '/' : '/auth/login'}
              className="block w-full text-center py-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition font-semibold"
            >
              {user ? t('pricing.current_plan') : t('pricing.sign_up_free')}
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="bg-[#1a1530] rounded-2xl p-8 border-2 border-yellow-400 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-4 py-1 rounded-full text-sm font-bold">
              {t('pricing.recommended')}
            </div>
            <h2 className="text-2xl font-bold font-fredoka mb-2">{t('pricing.pro')}</h2>
            <p className="text-3xl font-bold mb-6">
              $9<span className="text-lg text-gray-400 font-normal">/{t('pricing.month')}</span>
            </p>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.pro_1')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.pro_2')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.pro_3')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {t('pricing.pro_4')}
              </li>
            </ul>
            <button
              onClick={() => handleCheckout('pro')}
              disabled={loading === 'pro'}
              className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold transition disabled:opacity-50"
            >
              {loading === 'pro' ? '...' : t('pricing.subscribe')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}