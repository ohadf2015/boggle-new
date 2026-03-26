// Shared mock functions for supabase auth tests
// Defined in a separate file to avoid TDZ issues with vi.mock hoisting
import { vi } from 'vitest';

export const mockAuth = {
  signInWithOtp: vi.fn(),
  signInWithOAuth: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
};
