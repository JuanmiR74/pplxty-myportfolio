import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  
  // Si el contexto es undefined, devuelve un objeto seguro por defecto
  if (context === undefined) {
    return {
      user: null,
      session: null,
      loading: true,
      signUp: async () => ({ user: null, error: 'Auth no disponible' }),
      signIn: async () => ({ user: null, error: 'Auth no disponible' }),
      signOut: async () => {},
    };
  }
  
  return context;
}
