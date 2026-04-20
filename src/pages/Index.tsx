import React from 'react';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user } = useAuth();
  return (
    <div style={{ minHeight: '100vh', background: '#0b1020', color: '#f3f4f6' }}>
      <Header />
      <main style={{ padding: 24, display: 'grid', gap: 16 }}>
        <section style={{ background: '#111827', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 20 }}>
          <h1 style={{ marginTop: 0, marginBottom: 8 }}>Dashboard</h1>
          <p style={{ margin: 0, color: '#cbd5e1' }}>Sesión activa: {user?.email ?? 'sin usuario'}</p>
        </section>
        <section style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {['Fondos', 'Transacciones', 'Robo-Advisors', 'X-Ray'].map((label) => (
            <article key={label} style={{ background: '#111827', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 20 }}>
              <h2 style={{ marginTop: 0 }}>{label}</h2>
              <p style={{ color: '#94a3b8' }}>Sección reconstruida pendiente de reconectar con la lógica real del proyecto.</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
