import toast from 'react-hot-toast';

/**
 * Get the join URL for a game room
 * @param {string} gameCode - The game code
 * @returns {string} The full URL to join the game
 */
export const getJoinUrl = (gameCode) => {
  if (typeof window === 'undefined') return '';
  if (!gameCode) return '';
  const publicUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  return `${publicUrl}?room=${gameCode}`;
};

/**
 * Copy the join URL to clipboard
 * @param {string} gameCode - The game code
 * @param {function} t - Translation function (optional for backward compatibility)
 * @returns {Promise<boolean>} Success status
 */
export const copyJoinUrl = async (gameCode, t = null) => {
  const url = getJoinUrl(gameCode);

  try {
    await navigator.clipboard.writeText(url);
    const successMessage = t ? t('share.linkCopied') : 'Link copied! 📋';
    toast.success(successMessage, {
      duration: 2000,
      icon: '✅',
    });
    return true;
  } catch (error) {
    console.error('Failed to copy URL:', error);
    const errorMessage = t ? t('share.copyError') : 'Error copying link';
    toast.error(errorMessage, {
      duration: 2000,
    });
    return false;
  }
};

/**
 * Share game via WhatsApp
 * @param {string} gameCode - The game code
 * @param {string} roomName - The room name (optional)
 * @param {function} t - Translation function
 */
export const shareViaWhatsApp = (gameCode, roomName = '', t) => {
  const url = getJoinUrl(gameCode);

  const roomText = roomName ? `\n${t('share.room')}: ${roomName}` : '';
  const message = `🎮 ${t('share.inviteMessage')}\n${roomText}\n${t('share.code')}: ${gameCode}\n\n${t('share.joinViaLink')}:\n${url}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

/**
 * Copy the game code to clipboard
 * @param {string} gameCode - The game code
 * @param {function} t - Translation function (optional for backward compatibility)
 * @returns {Promise<boolean>} Success status
 */
export const copyGameCode = async (gameCode, t = null) => {
  try {
    await navigator.clipboard.writeText(gameCode);
    const successMessage = t ? t('share.codeCopied') : 'הקוד הועתק ללוח! 🎯';
    toast.success(successMessage, {
      duration: 2000,
      icon: '✅',
    });
    return true;
  } catch (error) {
    console.error('Failed to copy game code:', error);
    const errorMessage = t ? t('share.codeCopyError') : 'שגיאה בהעתקת הקוד';
    toast.error(errorMessage, {
      duration: 2000,
    });
    return false;
  }
};
