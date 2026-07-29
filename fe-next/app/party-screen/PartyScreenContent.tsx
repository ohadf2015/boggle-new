'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { Monitor, QrCode, Users, ArrowRight } from 'lucide-react';

/**
 * Party Screen Landing Page Content
 *
 * Shows instructions for setting up a TV/Party display.
 * Redirects to room-specific party screen when code is entered.
 */
export default function PartyScreenContent() {
  const { t } = useLanguage();
  const router = useRouter();

  const handleJoinRoom = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const roomCode = formData.get('roomCode') as string;
    if (roomCode?.trim()) {
      router.push(`/party-screen/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-dvh bg-neo-navy text-neo-white p-6 flex flex-col items-center justify-center">
      {/* Halftone texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)`,
          backgroundSize: '10px 10px',
        }}
      />

      <div className="relative z-10 max-w-lg w-full space-y-8 text-center">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Monitor className="w-12 h-12 text-neo-lime" />
            <h1 className="text-4xl font-black uppercase tracking-tight">
              {t('partyScreen.title')}
            </h1>
          </div>
          <p className="text-lg text-neo-white">
            {t('partyScreen.subtitle')}
          </p>
        </div>

        {/* Features */}
        <div className="grid gap-4 text-start">
          <div className="flex items-start gap-3 bg-neo-cream/10 p-4 rounded-neo border-2 border-neo-cream/20">
            <QrCode className="w-6 h-6 text-neo-cyan shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-neo-lime">{t('partyScreen.qrJoin')}</h3>
              <p className="text-sm text-neo-white">{t('partyScreen.qrJoinDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-neo-cream/10 p-4 rounded-neo border-2 border-neo-cream/20">
            <Users className="w-6 h-6 text-neo-pink shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-neo-lime">{t('partyScreen.liveLeaderboard')}</h3>
              <p className="text-sm text-neo-white">{t('partyScreen.liveLeaderboardDesc')}</p>
            </div>
          </div>
        </div>

        {/* Join Form */}
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-bold text-neo-white mb-2">
              {t('partyScreen.enterRoomCode')}
            </label>
            <input
              type="text"
              id="roomCode"
              name="roomCode"
              placeholder="ABCD"
              maxLength={6}
              className="w-full text-center text-3xl font-black uppercase tracking-widest bg-neo-cream text-neo-black border-4 border-neo-black rounded-neo p-4 shadow-hard placeholder:text-neo-black/30"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-neo-lime text-neo-black font-black text-xl py-4 px-6 uppercase border-4 border-neo-black rounded-neo shadow-hard-lg hover:shadow-hard transition-shadow flex items-center justify-center gap-2"
          >
            {t('partyScreen.startDisplay')}
            <ArrowRight className="w-6 h-6 rtl:scale-x-[-1]" />
          </button>
        </form>

        {/* Tip */}
        <p className="text-xs text-neo-white">
          {t('partyScreen.tip')}
        </p>
      </div>
    </div>
  );
}
