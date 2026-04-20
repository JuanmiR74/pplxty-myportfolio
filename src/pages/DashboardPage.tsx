import Header from '@/components/Header';
import FundsTable from '@/components/portfolio/FundsTable';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
export default function DashboardPage() {
  const p = usePortfolio();
  const xray = p.getXrayByEntity('all');
  return <div className="app-shell"><Header /><main className="main-grid">
    <section className="hero-grid">
      {[['Valor total', p.summary.totalValue], ['Invertido', p.summary.totalInvested], ['Plusvalía', p.summary.totalPL], ['Efectivo', p.summary.cashBalance]].map(([t,v]) => <article key={String(t)} className="card metric"><span className="muted">{t}</span><strong>{fmt(Number(v))}</strong></article>)}
    </section>
    <section className="grid-two">
      <div className="card"><h2>Distribución</h2><div style={{ width: '100%', height: 280 }}><ResponsiveContainer><PieChart><Pie data={p.distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>{p.distribution.map((d, i) => <Cell key={i} fill={d.fill} />)}</Pie><Tooltip formatter={(v: number) => fmt(v)} /></PieChart></ResponsiveContainer></div></div>
      <div className="card"><h2>Actualización de precios</h2><p className="muted">Arquitectura híbrida: fuente principal → fallback → caché persistente.</p><label className="stack"><span>Alpha Vantage API key</span><input className="input" value={p.apiKey} onChange={e => p.setApiKey(e.target.value)} /></label><button className="primary-btn full" onClick={p.updatePrices} disabled={p.loading}>{p.loading ? 'Cargando…' : 'Actualizar precios'}</button><div style={{ height: 16 }} /><div className="progress"><div className="progress-fill" style={{ width: `${0}%` }} /></div></div>
    </section>
    <section className="grid-two">
      <div className="card"><h2>X-Ray</h2><div style={{ width: '100%', height: 260 }}><ResponsiveContainer><BarChart data={xray.geography.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(v: number) => fmt(v)} /><Bar dataKey="value" fill="#3b82f6" /></BarChart></ResponsiveContainer></div></div>
      <div className="card"><h2>Robo-Advisors</h2><div className="stack gap-12"><button className="primary-btn" onClick={() => p.addRoboAdvisor({ name: 'Nuevo Robo', entity: 'MyInvestor', totalValue: 0, investedValue: 0, lastUpdated: new Date().toISOString(), subFunds: [], threeDim: { geography: [], sectors: [], assetClassPro: [] } })}>Añadir Robo-Advisor demo</button><p className="muted">Próxima entrega: alta/edición completa, editor de sub-fondos y radiografía granular por entidad.</p></div></div>
    </section>
    <FundsTable assets={p.assets} onAdd={p.addAsset} onRemove={p.removeAsset} onUpdate={p.updateAsset} onAddMovement={p.addMovement} onRemoveMovement={p.removeMovement} getByIsin={p.getByIsin} upsertIsin={p.upsertIsin} />
  </main></div>;
}