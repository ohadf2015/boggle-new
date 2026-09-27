'use client';

import { useState } from 'react';
import { Send, CheckCircle, XCircle, Loader2, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

interface EmailBulkActionsProps {
  authToken: string;
  emailType: string;
  emailLabel: string;
  gameMode?: string;
  showBulk?: boolean;
}

export function EmailBulkActions({
  authToken,
  emailType,
  emailLabel,
  gameMode,
  showBulk = true,
}: EmailBulkActionsProps) {
  const [playerIdentifier, setPlayerIdentifier] = useState('');
  const [playerStatus, setPlayerStatus] = useState<SendStatus>('idle');
  const [playerMessage, setPlayerMessage] = useState('');

  const [bulkStatus, setBulkStatus] = useState<SendStatus>('idle');
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkConfirmCount, setBulkConfirmCount] = useState<number | null>(null);

  const handleSendToPlayer = async () => {
    if (!playerIdentifier) {
      setPlayerStatus('error');
      setPlayerMessage('Please enter a player email or username');
      return;
    }

    setPlayerStatus('sending');
    setPlayerMessage('');

    const controller = new AbortController();
    const clientTimeout = setTimeout(() => controller.abort(), 55_000);

    try {
      const playerEndpoint =
        emailType === 'android-beta-launch'
          ? '/api/admin/send-android-beta-launch-to-player'
          : emailType === 'android-release-launch'
            ? '/api/admin/send-android-release-launch-to-player'
            : '/api/admin/send-reengagement-to-player';
      const response = await fetch(playerEndpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          playerIdentifier,
          ...(emailType === 'game-mode-announcement' && { mode: gameMode }),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send email');

      setPlayerStatus('success');
      setPlayerMessage(data.message || `Email sent to ${data.sentTo}`);
    } catch (err) {
      setPlayerStatus('error');
      if (err instanceof DOMException && err.name === 'AbortError') {
        setPlayerMessage('Client timeout after 55s — check server logs for step=… label');
      } else {
        setPlayerMessage(err instanceof Error ? err.message : 'Failed to send email');
      }
    } finally {
      clearTimeout(clientTimeout);
    }
  };

  const handleBulkSend = async (dryRun: boolean) => {
    setBulkStatus('sending');
    setBulkMessage('');

    try {
      const bulkEmailType = emailType === 'daily-challenge' ? 'reengagement' : emailType;

      const response = await fetch('/api/admin/send-bulk-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          emailType: bulkEmailType,
          dryRun,
          ...(emailType === 'game-mode-announcement' && { mode: gameMode }),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send bulk email');

      if (dryRun) {
        setBulkConfirmCount(data.total);
        setBulkStatus('idle');
        setBulkMessage(`Found ${data.total} eligible players. Click "Confirm Send" to proceed.`);
      } else {
        setBulkStatus('success');
        setBulkConfirmCount(null);
        setBulkMessage(`Sent: ${data.sent} | Failed: ${data.failed} | Total: ${data.total}`);
      }
    } catch (err) {
      setBulkStatus('error');
      setBulkConfirmCount(null);
      setBulkMessage(err instanceof Error ? err.message : 'Failed to send bulk email');
    }
  };

  return (
    <>
      {/* Send to Player */}
      <div className="mt-6 pt-4 border-t-2 border-slate-700 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <UserPlus className="w-4 h-4 text-neo-cyan" />
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
              disabled={playerStatus === 'sending' || !playerIdentifier}
              className={cn(
                'bg-neo-cyan text-neo-black font-bold border-3 border-neo-black shadow-hard-sm',
                'hover:bg-neo-cyan/80 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {playerStatus === 'sending' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {playerMessage && (
          <StatusMessage status={playerStatus} message={playerMessage} />
        )}

        <p className="text-xs text-slate-500">
          Sends a real {emailLabel} email (not [TEST]). Auto-detects player language.
        </p>
      </div>

      {/* Bulk Send */}
      {showBulk && (
        <div className="mt-4 pt-4 border-t-2 border-slate-700 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-neo-pink" />
            <span className="text-neo-white font-neo-display text-sm font-bold">
              Send to All Players
            </span>
          </div>

          <div className="flex gap-2">
            {bulkConfirmCount === null ? (
              <Button
                onClick={() => handleBulkSend(true)}
                disabled={bulkStatus === 'sending'}
                className={cn(
                  'flex-1 bg-neo-pink text-neo-black font-bold border-3 border-neo-black shadow-hard-sm',
                  'hover:bg-neo-pink-light active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {bulkStatus === 'sending' ? (
                  <>
                    <Loader2 className="w-4 h-4 me-2 animate-spin" />
                    Counting...
                  </>
                ) : (
                  <>
                    <Users className="w-4 h-4 me-2" />
                    Send {emailLabel} to All
                  </>
                )}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => handleBulkSend(false)}
                  disabled={bulkStatus === 'sending'}
                  className={cn(
                    'flex-1 bg-neo-red text-neo-white font-bold border-3 border-neo-black shadow-hard-sm',
                    'hover:bg-neo-red/80 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {bulkStatus === 'sending' ? (
                    <>
                      <Loader2 className="w-4 h-4 me-2 animate-spin" />
                      Sending to {bulkConfirmCount}...
                    </>
                  ) : (
                    `Confirm Send to ${bulkConfirmCount} Players`
                  )}
                </Button>
                <Button
                  onClick={() => { setBulkConfirmCount(null); setBulkMessage(''); }}
                  variant="outline"
                  className="border-2 border-slate-600 text-slate-400"
                >
                  Cancel
                </Button>
              </>
            )}
          </div>

          {bulkMessage && (
            <StatusMessage
              status={bulkStatus}
              message={bulkMessage}
              isConfirm={bulkStatus === 'idle' && bulkConfirmCount !== null}
            />
          )}

          <p className="text-xs text-slate-500">
            Two-step: first counts eligible players, then sends after confirmation.
          </p>
        </div>
      )}
    </>
  );
}

function StatusMessage({ status, message, isConfirm }: {
  status: SendStatus;
  message: string;
  isConfirm?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-3 rounded-neo border-2',
      status === 'success' && 'bg-green-500/10 border-green-500 text-green-400',
      status === 'error' && 'bg-neo-red/10 border-neo-red text-neo-red',
      isConfirm && 'bg-neo-pink/10 border-neo-pink text-neo-pink'
    )}>
      {status === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
      {status === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
