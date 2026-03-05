'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, Loader2, Eye, Calendar, UserX } from 'lucide-react';
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
type EmailType = 'reengagement' | 'daily-challenge';

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
} as const;

export function EmailTestPanel({ authToken, userEmail, userName }: EmailTestPanelProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [email, setEmail] = useState(userEmail || '');
  const [recipientName, setRecipientName] = useState(userName || '');
  const [emailType, setEmailType] = useState<EmailType>('reengagement');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const config = EMAIL_TYPE_CONFIG[emailType];

  const handleSendTestEmail = async () => {
    if (!email) {
      setStatus('error');
      setMessage(t('admin.email.errorNoEmail') || 'Please enter an email address');
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

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';

  const previewUrl = emailType === 'reengagement'
    ? `${baseUrl}${config.previewEndpoint}?language=${language}`
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
            {t('admin.email.title') || 'Email Testing'}
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

        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="test-email" className="text-neo-white font-medium">
            {t('admin.email.recipientEmail') || 'Recipient Email'}
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
            {t('admin.email.recipientName') || 'Recipient Name'}
            <span className="text-slate-500 ml-1">({t('common.optional') || 'optional'})</span>
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('admin.email.sending') || 'Sending...'}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
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
            <Eye className="w-4 h-4 mr-2" />
            {showPreview
              ? (t('admin.email.hidePreview') || 'Hide Preview')
              : (t('admin.email.showPreview') || 'Preview')
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
            {status === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
            {status === 'error' && <XCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Email Preview */}
        {showPreview && (
          <div className="mt-4 space-y-2">
            <Label className="text-neo-white font-medium">
              {t('admin.email.preview') || 'Email Preview'} — {config.label}
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
              {t('admin.email.previewNote') || 'Preview shows how the email will appear in recipients\' inboxes.'}
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
