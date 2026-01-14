'use client';

import { useState } from 'react';
import { Mail, Send, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
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

export function EmailTestPanel({ authToken, userEmail, userName }: EmailTestPanelProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  const [email, setEmail] = useState(userEmail || '');
  const [recipientName, setRecipientName] = useState(userName || '');
  const [status, setStatus] = useState<SendStatus>('idle');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleSendTestEmail = async () => {
    if (!email) {
      setStatus('error');
      setMessage(t('admin.email.errorNoEmail') || 'Please enter an email address');
      return;
    }

    setStatus('sending');
    setMessage('');

    try {
      const response = await fetch('/api/admin/send-test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email,
          recipientName: recipientName || 'Test User',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      setStatus('success');
      setMessage(data.message || `Test email sent to ${email}`);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to send email');
    }
  };

  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.com';

  return (
    <Card className={cn(
      'border-neo-black border-3 shadow-hard bg-neo-navy-light',
      isRTL && 'rtl'
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-neo-white">
          <div className="p-2 bg-neo-pink rounded-neo border-2 border-neo-black shadow-hard-sm">
            <Mail className="w-5 h-5 text-neo-black" />
          </div>
          <span className="font-neo-display text-lg">
            {t('admin.email.title') || 'Email Testing'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
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
                {t('admin.email.sendTest') || 'Send Test Email'}
              </>
            )}
          </Button>

          <Button
            onClick={() => setShowPreview(!showPreview)}
            variant="outline"
            className={cn(
              'min-w-[120px] border-2 border-neo-cyan text-neo-cyan',
              'hover:bg-neo-cyan hover:text-neo-black'
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
              {t('admin.email.preview') || 'Email Preview'}
            </Label>
            <div className="border-2 border-neo-black rounded-neo overflow-hidden">
              <iframe
                src={`${baseUrl}/api/admin/email-preview`}
                className="w-full h-[500px] bg-white"
                title="Email Preview"
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
            {t('admin.email.info') || 'Test emails are sent with [TEST] prefix in the subject line. They use the same template as production daily challenge emails.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
