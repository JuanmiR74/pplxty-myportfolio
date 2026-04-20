import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      session: null,
      loading: false,
      signUp: async () => ({ user: null, error: 'Auth no disponible' }),
      signIn: async () => ({ user: null, error: 'Auth no disponible' }),
      signOut: async () => {},
    };
  }
  return context;
}