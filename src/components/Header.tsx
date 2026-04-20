import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export function Header() {
  const { user, signOut } = useAuth();
  return (
    <header style={{ padding: 16, borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', color: '#fff' }}>
      <div style={{ fontWeight: 800 }}>PortfolioX</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: '#cbd5e1', fontSize: 14 }}>{user?.email ?? 'Invitado'}</span>
        {user && (
          <button onClick={() => signOut()} style={{ padding: '8px 10px', borderRadius: 8, border: 0, background: '#ef4444', color: '#fff' }}>
            Salir
          </button>
        )}
      </div>
    </header>
  );
}
