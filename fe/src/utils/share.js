import toast from 'react-hot-toast';

/**
 * Get the join URL for a game room
 * @param {string} gameCode - The game code
 * @returns {string} The full URL to join the game
 */
export const getJoinUrl = (gameCode) => {
  const publicUrl = process.env.REACT_APP_PUBLIC_URL || window.location.origin;
  return `${publicUrl}?room=${gameCode}`;
};

/**
 * Copy the join URL to clipboard
 * @param {string} gameCode - The game code
 * @returns {Promise<boolean>} Success status
 */
export const copyJoinUrl = async (gameCode) => {
  const url = getJoinUrl(gameCode);

  try {
    await navigator.clipboard.writeText(url);
    toast.success('הקישור הועתק ללוח! 📋', {
      duration: 2000,
      icon: '✅',
    });
    return true;
  } catch (error) {
    console.error('Failed to copy URL:', error);
    toast.error('שגיאה בהעתקת הקישור', {
      duration: 2000,
    });
    return false;
  }
};

/**
 * Share game via WhatsApp
 * @param {string} gameCode - The game code
 * @param {string} roomName - The room name (optional)
 */
export const shareViaWhatsApp = (gameCode, roomName = '') => {
  const url = getJoinUrl(gameCode);
  const roomText = roomName ? `"${roomName}"` : '';
  const message = `🎮 בואו לשחק Boggle איתי!\n\n` +
    `${roomText ? `חדר: ${roomText}\n` : ''}` +
    `קוד: ${gameCode}\n\n` +
    `הצטרפו דרך הקישור:\n${url}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

/**
 * Copy the game code to clipboard
 * @param {string} gameCode - The game code
 * @returns {Promise<boolean>} Success status
 */
export const copyGameCode = async (gameCode) => {
  try {
    await navigator.clipboard.writeText(gameCode);
    toast.success('הקוד הועתק ללוח! 🎯', {
      duration: 2000,
      icon: '✅',
    });
    return true;
  } catch (error) {
    console.error('Failed to copy game code:', error);
    toast.error('שגיאה בהעתקת הקוד', {
      duration: 2000,
    });
    return false;
  }
};
