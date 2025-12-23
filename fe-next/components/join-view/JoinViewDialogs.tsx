'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { FaQrcode } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { getJoinUrl } from '../../utils/share';
import { useLanguage } from '../../contexts/LanguageContext';

const NewPlayerWelcome = dynamic(() => import('../NewPlayerWelcome'), { ssr: false });

interface JoinViewDialogsProps {
  gameCode: string;
  showNewPlayerWelcome: boolean;
  showQR: boolean;
  onCloseNewPlayerWelcome: () => void;
  onCloseQR: () => void;
  onSetShowQR: (value: boolean) => void;
}

/**
 * JoinViewDialogs - All modal dialogs used in JoinView
 */
const JoinViewDialogs: React.FC<JoinViewDialogsProps> = React.memo(({
  gameCode,
  showNewPlayerWelcome,
  showQR,
  onCloseNewPlayerWelcome,
  onCloseQR,
  onSetShowQR
}) => {
  const { t, language } = useLanguage();
  const joinUrl = getJoinUrl(gameCode);

  return (
    <>
      {/* New Player Welcome Modal */}
      <NewPlayerWelcome
        isOpen={showNewPlayerWelcome}
        onClose={onCloseNewPlayerWelcome}
        rulesPageUrl={`/${language}/rules`}
      />

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={onSetShowQR}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-slate-800 border-cyan-500/30">
          <DialogHeader>
            <DialogTitle className="text-center text-cyan-300 flex items-center justify-center gap-2">
              <FaQrcode />
              {t('joinView.qrCodeTitle')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <QRCodeSVG value={joinUrl} size={250} level="H" includeMargin />
            </div>
            <h4 className="text-3xl font-bold text-cyan-400">{gameCode}</h4>
            <p className="text-sm text-center text-slate-600 dark:text-gray-300">
              {t('joinView.scanToJoin')} {gameCode}
            </p>
            <p className="text-xs text-center text-slate-500 dark:text-gray-300 mt-2">
              {joinUrl}
            </p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={onCloseQR}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.5)]"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

JoinViewDialogs.displayName = 'JoinViewDialogs';

export default JoinViewDialogs;
