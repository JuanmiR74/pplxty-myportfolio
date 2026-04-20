import { useState } from 'react';
import type { Asset, RoboMovement } from '@/types/portfolio';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export function TransactionHistory({ asset, onAddMovement, onRemoveMovement }: { asset: Asset; onAddMovement: (assetId: string, movement: Omit<RoboMovement, 'id'>) => void; onRemoveMovement: (assetId: string, movementId: string) => void }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const totalInvested = (asset.movements ?? []).reduce((s, m) => s + (m.category === 'retirada' ? -m.amount : m.amount), 0);
  return (
    <div className="stack gap-12">
      <div className="row between"><strong>Capital invertido</strong><strong>{fmt(totalInvested)}</strong></div>
      <div className="grid-3">
        <input className="input" placeholder="Importe" value={amount} onChange={e => setAmount(e.target.value)} />
        <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <input className="input" placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <button className="primary-btn" onClick={() => { const value = Number(amount); if (!value) return; onAddMovement(asset.id, { category: value >= 0 ? 'aportacion' : 'retirada', amount: Math.abs(value), date, description }); setAmount(''); setDescription(''); }}>Añadir movimiento</button>
      {!(asset.movements ?? []).length ? <p className="muted">Sin movimientos registrados. Añade una aportación para empezar.</p> : (
        <table className="simple-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Importe</th><th>Descripción</th><th></th></tr></thead><tbody>
          {(asset.movements ?? []).map(m => <tr key={m.id}><td>{m.date}</td><td>{m.category}</td><td>{m.category === 'retirada' ? '-' : '+'}{fmt(m.amount)}</td><td>{m.description || '—'}</td><td><button className="ghost-btn" onClick={() => onRemoveMovement(asset.id, m.id)}>Eliminar</button></td></tr>)}
        </tbody></table>
      )}
    </div>
  );
}