import { useCallback } from 'react';
import { validateUsername, validateRoomName, validateGameCode, sanitizeInput, ValidationResult } from '../utils/validation';
import toast from 'react-hot-toast';

interface UserValidationResult extends ValidationResult {
  cleaned: string;
}

interface RoomValidationResult extends ValidationResult {
  cleaned: string;
}

interface UseValidationReturn {
  validateUser: (username: string) => UserValidationResult;
  validateRoom: (roomName: string) => RoomValidationResult;
  validateCode: (code: string) => ValidationResult;
  sanitizeInput: typeof sanitizeInput;
  notifyError: (key?: string) => void;
}

export const useValidation = (t: (key: string) => string): UseValidationReturn => {
  const validateUser = useCallback((username: string): UserValidationResult => {
    const cleaned = sanitizeInput(username, 20);
    const res = validateUsername(cleaned);
    return { cleaned, ...res };
  }, []);

  const validateRoom = useCallback((roomName: string): RoomValidationResult => {
    const cleaned = sanitizeInput(roomName, 30);
    const res = validateRoomName(cleaned, true); // true = optional (room names get defaults if empty)
    return { cleaned, ...res };
  }, []);

  const validateCode = useCallback((code: string): ValidationResult => {
    const res = validateGameCode(code);
    return res;
  }, []);

  const notifyError = useCallback((key?: string) => {
    if (!key) return;
    toast.error(t(key) || key);
  }, [t]);

  return { validateUser, validateRoom, validateCode, sanitizeInput, notifyError };
};
