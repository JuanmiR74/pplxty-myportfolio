import { LogOut, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user, signOut } = useAuth();
  return (
    <header className="header">
      <div className="brand"><TrendingUp size={18} /> <span>PortfolioX</span></div>
      <div className="header-right">
        <span className="muted">{user?.email}</span>
        <button className="ghost-btn" onClick={() => signOut()}><LogOut size={16} /> Salir</button>
      </div>
    </header>
  );
}