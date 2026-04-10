'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, Loader2, Eye, Calendar, UserX, UserPlus, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface EmailTestPanelProps {
  authToken: string;
  userEmail?: string;
  userName?: string;
}

type SendStatus = 'idle' | 'sending' | 'success' | 'error';
type EmailType = 'reengagement' | 'daily-challenge' | 'game-mode-announcement';
type GameMode = 'blast' | 'wordhunt' | 'adventure';

const EMAIL_TYPE_CONFIG = {
  'reengagement': {
    label: 'Re-engagement',
    icon: UserX,
    endpoint: '/api/admin/send-test-reengagement',
    previewEndpoint: '/api/admin/reengagement-email-preview',
    previewTitle: 'Re-engagement Email Preview',
    infoText: 'Sends a test re-engagement email with [TEST] prefix. Uses today\u2019s daily word first letter for the current language.',
    color: 'neo-pink',
    bgClass: 'bg-neo-pink',
    borderClass: 'border-neo-pink',
    textClass: 'text-neo-pink',
  },
  'daily-challenge': {
    label: 'Daily Challenge',
    icon: Calendar,
    endpoint: '/api/admin/send-test-email',
    previewEndpoint: '/api/admin/email-preview',
    previewTitle: 'Daily Challenge Email Preview',
    infoText: 'Sends a test daily challenge email with [TEST] prefix. Shows today\u2019s puzzle number and streak reminder.',
    color: 'neo-cyan',
    bgClass: 'bg-neo-cyan',
    borderClass: 'border-neo-cyan',
    textClass: 'text-neo-cyan',
  },
  'game-mode-announcement': {
    label: 'Game Mode',
    icon: Rocket,
    endpoint: '/api/admin/send-test-game-mode-announcement',
    previewEndpoint: '/api/admin/game-mode-announcement-preview',
    previewTitle: 'Game Mode Announcement Preview',
    infoText: 'Sends a test game mode announcement with [TEST] prefix. Features the marshmallow mascot, hero image, and a single CTA.',
    color: 'neo-pink',
    bgClass: 'bg-neo-pink',
    borderClass: 'border-neo-pink',
    textClass: 'text-neo-pink',
  },
} as const;

const GAME_MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: 'blast', label: 'Blast' },
  { value: 'wordhunt', label: 'Word Hunt' },
  { value: 'adventure', label: 'Adventure' },
];

export function EmailTestPanel({ authToken, userEmail, userName }: EmailTestPanelProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [email, setEmail] = useState(userEmail || '');
  const [recipientName, setRecipientName] = useState(userName || '');
  const [emailType, setEmailType] = useState<EmailType>('reengagement');
  const [gameMode, setGameMode] = useState<GameMode>('blast');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Manual send to player state
  const [playerIdentifier, setPlayerIdentifier] = useState('');
  const [playerSendStatus, setPlayerSendStatus] = useState<SendStatus>('idle');
  const [playerSendMessage, setPlayerSendMessage] = useState('');

  const config = EMAIL_TYPE_CONFIG[emailType];

  const handleSendTestEmail = async () => {
    if (!email) {
      setStatus('error');
      setMessage(t('admin.email.errorNoEmail'));
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email,
          recipientName: recipientName || 'Test User',
          language,
          ...(emailType === 'game-mode-announcement' && { mode: gameMode }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setStatus('success');
      setMessage(data.message || `Test ${config.label} email sent to ${email}`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to send email');
    }
  };

  const handleTypeChange = (type: EmailType) => {
    setEmailType(type);
    setStatus('idle');
    setMessage('');
    setShowPreview(false);
  };

  const handleSendToPlayer = async () => {
    if (!playerIdentifier) {
      setPlayerSendStatus('error');
      setPlayerSendMessage('Please enter a player email or username');
      return;
    }

    setPlayerSendStatus('sending');
    setPlayerSendMessage('');

    try {
      const response = await fetch('/api/admin/send-reengagement-to-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ playerIdentifier }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setPlayerSendStatus('success');
      setPlayerSendMessage(data.message || `Email sent to ${data.sentTo}`);
    } catch (err) {
      setPlayerSendStatus('error');
      setPlayerSendMessage(err instanceof Error ? err.message : 'Failed to send email');
    }
  };

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';

  const previewUrl = emailType === 'reengagement'
    ? `${baseUrl}${config.previewEndpoint}?language=${language}`
    : emailType === 'game-mode-announcement'
      ? `${baseUrl}${config.previewEndpoint}?language=${language}&mode=${gameMode}`
      : `${baseUrl}${config.previewEndpoint}`;

  return (
    <Card className={cn(
      'border-neo-black border-3 shadow-hard bg-neo-navy-light',
      isRTL && 'rtl'
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-neo-white">
          <div className={cn('p-2 rounded-neo border-2 border-neo-black shadow-hard-sm', config.bgClass)}>
            <Mail className="w-5 h-5 text-neo-black" />
          </div>
          <span className="font-neo-display text-lg">
            {t('admin.email.title')}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Email Type Selector */}
        <div className="flex gap-2">
          {(Object.entries(EMAIL_TYPE_CONFIG) as [EmailType, typeof EMAIL_TYPE_CONFIG[EmailType]][]).map(([type, cfg]) => {
            const Icon = cfg.icon;
            const isActive = emailType === type;
            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-neo border-2 font-bold text-sm transition-all',
                  isActive
                    ? `${cfg.bgClass} text-neo-black border-neo-black shadow-hard-sm`
                    : `bg-neo-navy ${cfg.borderClass} ${cfg.textClass} hover:opacity-80`
                )}
              >
                <Icon className="w-4 h-4" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Game Mode Selector (only for game-mode-announcement) */}
        {emailType === 'game-mode-announcement' && (
          <div className="space-y-2">
            <Label className="text-neo-white font-medium">Game Mode</Label>
            <div className="flex gap-2">
              {GAME_MODE_OPTIONS.map((opt) => {
                const isActive = gameMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setGameMode(opt.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-neo border-2 font-bold text-sm transition-all',
                      isActive
                        ? 'bg-neo-pink text-neo-black border-neo-black shadow-hard-sm'
                        : 'bg-neo-navy border-neo-pink text-neo-pink hover:opacity-80'
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="test-email" className="text-neo-white font-medium">
            {t('admin.email.recipientEmail')}
          </Label>
          <Input
            id="test-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            className="bg-neo-navy border-2 border-neo-black text-neo-white placeholder:text-slate-500"
          />
        </div>

        {/* Name Input */}
        <div className="space-y-2">
          <Label htmlFor="recipient-name" className="text-neo-white font-medium">
            {t('admin.email.recipientName')}
            <span className="text-slate-500 ms-1">({t('common.optional')})</span>
          </Label>
          <Input
            id="recipient-name"
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="John Doe"
            className="bg-neo-navy border-2 border-neo-black text-neo-white placeholder:text-slate-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            onClick={handleSendTestEmail}
            disabled={status === 'sending' || !email}
            className={cn(
              'flex-1 min-w-[140px] bg-neo-lime text-neo-black font-bold border-3 border-neo-black shadow-hard',
              'hover:bg-neo-lime-light active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {status === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin" />
                {t('admin.email.sending')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 me-2" />
                Send {config.label} Email
              </>
            )}
          </Button>

          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            className={cn(
              'min-w-[120px] border-2',
              config.borderClass,
              config.textClass,
              `hover:${config.bgClass} hover:text-neo-black`
            )}
          >
            <Eye className="w-4 h-4 me-2" />
            {showPreview
              ? (t('admin.email.hidePreview'))
              : (t('admin.email.showPreview'))
            }
          </Button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={cn(
            'flex items-center gap-2 p-3 rounded-neo border-2',
            status === 'success' && 'bg-green-500/10 border-green-500 text-green-400',
            status === 'error' && 'bg-neo-red/10 border-neo-red text-neo-red'
          )}>
            {status === 'success' && <CheckCircle className="w-5 h-5 shrink-0" />}
            {status === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Email Preview */}
        {showPreview && (
          <div className="mt-4 space-y-2">
            <Label className="text-neo-white font-medium">
              {t('admin.email.preview')} — {config.label}
            </Label>
            <div className="border-2 border-neo-black rounded-neo overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-[500px] bg-white"
                title={config.previewTitle}
                sandbox="allow-same-origin"
              />
            </div>
            <p className="text-xs text-slate-500">
              {t('admin.email.previewNote')}
            </p>
          </div>
        )}

        {/* Send to Player Section */}
        {emailType === 'reengagement' && (
          <div className="mt-6 pt-4 border-t-2 border-slate-700 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-neo-orange" />
              <span className="text-neo-white font-neo-display text-sm font-bold">
                Send to Player (Real Email)
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="player-identifier" className="text-neo-white font-medium text-sm">
                Player Email or Username
              </Label>
              <div className="flex gap-2">
                <Input
                  id="player-identifier"
                  type="text"
                  value={playerIdentifier}
                  onChange={(e) => setPlayerIdentifier(e.target.value)}
                  placeholder="player@email.com or username"
                  className="bg-neo-navy border-2 border-neo-black text-neo-white placeholder:text-slate-500 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleSendToPlayer()}
                />
                <Button
                  onClick={handleSendToPlayer}
                  disabled={playerSendStatus === 'sending' || !playerIdentifier}
                  className={cn(
                    'bg-neo-orange text-neo-black font-bold border-3 border-neo-black shadow-hard-sm',
                    'hover:bg-neo-orange/80 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {playerSendStatus === 'sending' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {playerSendMessage && (
              <div className={cn(
                'flex items-center gap-2 p-3 rounded-neo border-2',
                playerSendStatus === 'success' && 'bg-green-500/10 border-green-500 text-green-400',
                playerSendStatus === 'error' && 'bg-neo-red/10 border-neo-red text-neo-red'
              )}>
                {playerSendStatus === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
                {playerSendStatus === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
                <span className="text-sm font-medium">{playerSendMessage}</span>
              </div>
            )}

            <p className="text-xs text-slate-500">
              Sends a real re-engagement email (not [TEST]). Auto-detects player language.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-4 p-3 bg-neo-navy rounded-neo border-2 border-slate-700">
          <p className="text-xs text-slate-400">
            {config.infoText} ({language})
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
