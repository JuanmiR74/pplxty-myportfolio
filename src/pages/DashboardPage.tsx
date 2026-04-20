import Header from '@/components/Header';
import FundsTable from '@/components/portfolio/FundsTable';
import { usePortfolio } from '@/hooks/usePortfolio';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const fmt = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);

export default function DashboardPage() {
  const portfolio = usePortfolio();
  return (
    <div className="app-shell">
      <Header />
      <main className="main-grid">
        <section className="hero-grid">
          <article className="card metric"><span className="muted">Valor total</span><strong>{fmt(portfolio.summary.totalValue)}</strong></article>
          <article className="card metric"><span className="muted">Invertido</span><strong>{fmt(portfolio.summary.totalInvested)}</strong></article>
          <article className="card metric"><span className="muted">Plusvalía</span><strong>{fmt(portfolio.summary.totalPL)}</strong></article>
          <article className="card metric"><span className="muted">Efectivo</span><strong>{fmt(portfolio.summary.cashBalance)}</strong></article>
        </section>
        <section className="grid-two">
          <div className="card">
            <div className="row between"><h2>Distribución</h2></div>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={portfolio.distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                    {portfolio.distribution.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card stack gap-12">
            <h2>Configuración rápida</h2>
            <label className="stack"><span>API Key Alpha Vantage</span><input className="input" value={portfolio.apiKey} onChange={e => portfolio.setApiKey(e.target.value)} placeholder="Pega aquí tu API key" /></label>
            <label className="stack"><span>Efectivo</span><input className="input" type="number" value={portfolio.cashBalance} onChange={e => portfolio.setCashBalance(Number(e.target.value || 0))} /></label>
            <p className="muted">Los cambios se guardan automáticamente en tu cartera.</p>
          </div>
        </section>
        <FundsTable assets={portfolio.assets} onAdd={portfolio.addAsset} onRemove={portfolio.removeAsset} onUpdate={portfolio.updateAsset} onAddMovement={portfolio.addMovement} onRemoveMovement={portfolio.removeMovement} getByIsin={portfolio.getByIsin} upsertIsin={portfolio.upsertIsin} />
      </main>
    </div>
  );
}