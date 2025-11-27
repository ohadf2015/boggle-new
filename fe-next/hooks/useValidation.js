import { useCallback } from 'react';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput } from '../utils/validation';
import toast from 'react-hot-toast';

export const useValidation = (t) => {
  const validateUser = useCallback((username) => {
    const cleaned = sanitizeInput(username, 20);
    const res = validateUsername(cleaned);
    return { cleaned, ...res };
  }, []);

  const validateRoom = useCallback((roomName) => {
    const cleaned = sanitizeInput(roomName, 30);
    const res = validateRoomName(cleaned);
    return { cleaned, ...res };
  }, []);

  const validateCode = useCallback((code) => {
    const res = validateGameCode(code);
    return res;
  }, []);

  const notifyError = useCallback((key) => {
    if (!key) return;
    toast.error(t(key) || key);
  }, [t]);

  return { validateUser, validateRoom, validateCode, sanitizeInput, notifyError };
};
