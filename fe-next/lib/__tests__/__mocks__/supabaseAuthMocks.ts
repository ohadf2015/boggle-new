// Shared mock functions for supabase auth tests
// Defined in a separate file to avoid TDZ issues with jest.mock hoisting
export const mockAuth = {
  signInWithOtp: jest.fn(),
  signInWithOAuth: jest.fn(),
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  getUser: jest.fn(),
};
