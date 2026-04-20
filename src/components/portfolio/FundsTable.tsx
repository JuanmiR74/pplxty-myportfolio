import { useState } from 'react';
import type { Asset, AssetType, IsinEntry, RoboMovement } from '@/types/portfolio';
import { TransactionHistory } from '@/components/portfolio/TransactionHistory';
import { calcInvestedFromMovements } from '@/hooks/usePortfolio';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function FundsTable({ assets, onAdd, onRemove, onUpdate, onAddMovement, onRemoveMovement, getByIsin, upsertIsin }: {
  assets: Asset[];
  onAdd: (asset: Omit<Asset, 'id'>) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Asset>) => void;
  onAddMovement: (assetId: string, movement: Omit<RoboMovement, 'id'>) => void;
  onRemoveMovement: (assetId: string, movementId: string) => void;
  getByIsin?: (isin: string) => IsinEntry | undefined;
  upsertIsin?: (entry: Omit<IsinEntry, 'id'> & { id?: string }) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', ticker: '', type: 'Fondos MyInvestor' as AssetType, shares: '', buyPrice: '', currentPrice: '' });
  const asset = assets.find(a => a.id === historyId) || null;
  const totalValue = assets.reduce((s, a) => s + a.shares * a.currentPrice, 0);
  const totalInvested = assets.reduce((s, a) => s + ((a.movements?.length ? calcInvestedFromMovements(a.movements) : a.buyPrice * a.shares)), 0);
  return (
    <section className="card">
      <div className="row between wrap"><h2>Fondos de inversión</h2><button className="primary-btn" onClick={() => setShowForm(v => !v)}>{showForm ? 'Cerrar' : 'Añadir fondo'}</button></div>
      {showForm && <div className="form-card">
        <div className="grid-3">
          <input className="input" placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="ISIN / Ticker" value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} onBlur={() => { const entry = getByIsin?.(form.ticker.toUpperCase()); if (entry) setForm(prev => ({ ...prev, name: prev.name || entry.name, type: entry.assetType })); }} />
          <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as AssetType })}><option>Fondos MyInvestor</option><option>Fondos BBK</option><option>Acciones</option></select>
          <input className="input" placeholder="Participaciones" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} />
          <input className="input" placeholder="Total invertido" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} />
          <input className="input" placeholder="Precio actual" value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} />
        </div>
        <button className="primary-btn" onClick={() => {
          const shares = Number(form.shares); const invested = Number(form.buyPrice); const currentPrice = Number(form.currentPrice || 0); if (!form.name || !form.ticker || !shares) return;
          onAdd({ name: form.name, ticker: form.ticker, isin: form.ticker, type: form.type, shares, buyPrice: invested / shares, currentPrice, movements: [], threeDim: { geography: [], sectors: [], assetClassPro: [] } });
          upsertIsin?.({ isin: form.ticker, name: form.name, assetType: form.type, geography: [], sectors: [], assetClassPro: [] });
          setForm({ name: '', ticker: '', type: 'Fondos MyInvestor', shares: '', buyPrice: '', currentPrice: '' }); setShowForm(false);
        }}>Guardar</button>
      </div>}
      <div className="stats-row"><div><span className="muted">Invertido</span><strong>{fmt(totalInvested)}</strong></div><div><span className="muted">Valor actual</span><strong>{fmt(totalValue)}</strong></div><div><span className="muted">Plusvalía</span><strong>{fmt(totalValue-totalInvested)}</strong></div></div>
      <table className="simple-table"><thead><tr><th>Nombre</th><th>Entidad</th><th>Aportado</th><th>Uds.</th><th>Precio</th><th>Valor</th><th>Acciones</th></tr></thead><tbody>
        {assets.map(a => { const invested = a.movements?.length ? calcInvestedFromMovements(a.movements) : a.buyPrice * a.shares; const value = a.shares * a.currentPrice; return <tr key={a.id}><td><div>{a.name}</div><small className="muted">{a.ticker}</small></td><td>{a.type}</td><td>{fmt(invested)}</td><td>{a.shares.toFixed(4)}</td><td>{fmt(a.currentPrice)}</td><td>{fmt(value)}</td><td><div className="row"><button className="ghost-btn" onClick={() => setHistoryId(a.id)}>Historial</button><button className="ghost-btn" onClick={() => onRemove(a.id)}>Eliminar</button></div></td></tr>})}
        {!assets.length && <tr><td colSpan={7} className="muted">No hay fondos todavía.</td></tr>}
      </tbody></table>
      {asset && <div className="modal-backdrop" onClick={() => setHistoryId(null)}><div className="modal-card" onClick={e => e.stopPropagation()}><div className="row between"><h3>Historial · {asset.name}</h3><button className="ghost-btn" onClick={() => setHistoryId(null)}>Cerrar</button></div><TransactionHistory asset={asset} onAddMovement={onAddMovement} onRemoveMovement={onRemoveMovement} /></div></div>}
    </section>
  );
}