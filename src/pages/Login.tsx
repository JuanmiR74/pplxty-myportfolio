import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function Login() {
  const { signIn, signUp, user } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  if (user) return <Navigate to="/" replace />;
  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>PortfolioX</h1>
        <p className="muted">Accede a tu cartera</p>
        <div className="tabs"><button className={mode==='login'?'tab active':'tab'} onClick={() => setMode('login')}>Iniciar sesión</button><button className={mode==='signup'?'tab active':'tab'} onClick={() => setMode('signup')}>Registrarse</button></div>
        <input className="input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
        {error && <div className="error-box">{error}</div>}
        <button className="primary-btn full" disabled={loading} onClick={async () => { setLoading(true); setError(''); const result = mode === 'login' ? await signIn(email, password) : await signUp(email, password); if (result.error) setError(result.error); setLoading(false); }}>{loading ? 'Procesando…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
      </div>
    </div>
  );
}