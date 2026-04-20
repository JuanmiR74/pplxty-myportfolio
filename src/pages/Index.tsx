import React from 'react';
import { Header } from '@/components/Header';

export default function Index() {
  return (
    <div>
      <Header />
      <main style={{ padding: 24, color: '#f3f4f6' }}>
        <h1 style={{ marginTop: 0 }}>Dashboard reconstruido</h1>
        <p style={{ color: '#94a3b8' }}>La autenticación ya es funcional. La siguiente fase consiste en reconectar todas las vistas reales de cartera, fondos, robo-advisors y X-Ray sobre esta base estable.</p>
      </main>
    </div>
  );
}
