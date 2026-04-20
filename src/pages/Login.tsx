import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const action = mode === 'login' ? signIn : signUp;
    const res = await action(email.trim(), password);
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0b1020', color: '#f3f4f6', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#121a31', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 24, boxShadow: '0 20px 50px rgba(0,0,0,.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>PortfolioX</h1>
            <p style={{ margin: '8px 0 0', color: '#9ca3af' }}>Autenticación, fondos, transacciones y X-Ray</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setMode('login')} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 0, background: mode === 'login' ? '#2563eb' : '#1f2937', color: '#fff' }}>Iniciar sesión</button>
          <button onClick={() => setMode('signup')} style={{ flex: 1, padding: '10px 12px', borderRadius: 10, border: 0, background: mode === 'signup' ? '#2563eb' : '#1f2937', color: '#fff' }}>Crear cuenta</button>
        </div>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: '#0f172a', color: '#fff' }} />
          </label>
          <label style={{ display: 'grid', gap: 6 }}>
            <span>Contraseña</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', background: '#0f172a', color: '#fff' }} />
          </label>
          {error && <div style={{ color: '#fca5a5', fontSize: 14 }}>{error}</div>}
          <button type="submit" disabled={submitting || loading} style={{ padding: '12px 14px', borderRadius: 10, border: 0, background: '#10b981', color: '#081018', fontWeight: 700 }}>
            {submitting ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>
        </form>
      </div>
    </div>
  );
}
