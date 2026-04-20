import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Asset, RoboAdvisor, PortfolioState, ThreeDimensionClassification, RoboSubFund, IsinEntry, RoboMovement } from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const EMPTY_STATE: PortfolioState = { assets: [], roboAdvisors: [], cashBalance: 0, apiKey: '', historicalData: [], isinLibrary: [] };
const emptyThreeDim = (): ThreeDimensionClassification => ({ geography: [], sectors: [], assetClassPro: [] });
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
export function calcInvestedFromMovements(movements: RoboMovement[] = []) { return movements.reduce((a, m) => a + (m.category === 'retirada' ? -Math.abs(m.amount) : Math.abs(m.amount)) - (m.category === 'comision' ? Math.abs(m.commission ?? m.amount ?? 0) : 0), 0); }

export function usePortfolio() {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!user || !supabase) { setLoading(false); setState(EMPTY_STATE); return; }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('user_portfolio').select('data').eq('user_id', user.id).maybeSingle();
      if (!alive) return;
      if (error) toast.error(`Error cargando cartera: ${error.message}`);
      const parsed = ((data as any)?.data ?? EMPTY_STATE) as PortfolioState;
      setState({
        ...EMPTY_STATE,
        ...parsed,
        assets: (parsed.assets ?? []).map(a => ({ ...a, movements: a.movements ?? [], threeDim: a.threeDim ?? emptyThreeDim() })),
        roboAdvisors: (parsed.roboAdvisors ?? []).map(r => ({ ...r, subFunds: r.subFunds ?? [], threeDim: r.threeDim ?? emptyThreeDim() })),
      });
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const persist = useCallback((next: PortfolioState) => {
    if (!user || !supabase) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const { error } = await supabase.from('user_portfolio').upsert({ user_id: user.id, data: clone(next), updated_at: new Date().toISOString() });
      if (error) toast.error(`Error guardando cartera: ${error.message}`);
    }, 250);
  }, [user]);

  const mutate = useCallback((updater: (prev: PortfolioState) => PortfolioState) => {
    setState(prev => { const next = updater(prev); persist(next); return next; });
  }, [persist]);

  const addAsset = useCallback((asset: Omit<Asset, 'id'>) => mutate(prev => ({ ...prev, assets: [...prev.assets, { ...asset, id: crypto.randomUUID(), movements: asset.movements ?? [], threeDim: asset.threeDim ?? emptyThreeDim() }] })), [mutate]);
  const removeAsset = useCallback((id: string) => mutate(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) })), [mutate]);
  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a) })), [mutate]);
  const addMovement = useCallback((assetId: string, movement: Omit<RoboMovement, 'id'>) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === assetId ? { ...a, movements: [...(a.movements ?? []), { ...movement, id: crypto.randomUUID() }] } : a) })), [mutate]);
  const removeMovement = useCallback((assetId: string, movementId: string) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === assetId ? { ...a, movements: (a.movements ?? []).filter(m => m.id !== movementId) } : a) })), [mutate]);

  const addRoboAdvisor = useCallback((robo: Omit<RoboAdvisor, 'id'>) => mutate(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, { ...robo, id: crypto.randomUUID(), subFunds: robo.subFunds ?? [], threeDim: robo.threeDim ?? emptyThreeDim() }] })), [mutate]);
  const updateRoboAdvisor = useCallback((id: string, updates: Partial<RoboAdvisor>) => mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates, subFunds: updates.subFunds ?? r.subFunds ?? [], threeDim: updates.threeDim ?? r.threeDim ?? emptyThreeDim() } : r) })), [mutate]);
  const updateRoboThreeDim = useCallback((id: string, threeDim: ThreeDimensionClassification) => updateRoboAdvisor(id, { threeDim }), [updateRoboAdvisor]);
  const updateRoboSubFunds = useCallback((id: string, subFunds: RoboSubFund[]) => updateRoboAdvisor(id, { subFunds }), [updateRoboAdvisor]);
  const removeRoboAdvisor = useCallback((id: string) => mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) })), [mutate]);

  const setApiKey = useCallback((apiKey: string) => mutate(prev => ({ ...prev, apiKey })), [mutate]);
  const setCashBalance = useCallback((cashBalance: number) => mutate(prev => ({ ...prev, cashBalance })), [mutate]);
  const updatePrices = useCallback((prices: Record<string, number>, symbols?: Record<string, string>) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => ({ ...a, ...(prices[a.ticker] !== undefined ? { currentPrice: prices[a.ticker] } : {}), ...(symbols?.[a.ticker] ? { marketSymbol: symbols[a.ticker] } : {}) })) })), [mutate]);
  const getByIsin = useCallback((isin: string): IsinEntry | undefined => state.isinLibrary.find(e => e.isin === isin), [state.isinLibrary]);
  const upsertIsin = useCallback((entry: Omit<IsinEntry, 'id'> & { id?: string }) => mutate(prev => { const i = prev.isinLibrary.findIndex(e => e.isin === entry.isin); const next = [...prev.isinLibrary]; if (i >= 0) next[i] = { ...next[i], ...entry, id: next[i].id }; else next.push({ ...entry, id: entry.id ?? crypto.randomUUID() }); return { ...prev, isinLibrary: next }; }), [mutate]);
  const updateIsinClassification = useCallback((isin: string, td: ThreeDimensionClassification) => mutate(prev => ({ ...prev, isinLibrary: prev.isinLibrary.map(e => e.isin === isin ? { ...e, geography: td.geography, sectors: td.sectors, assetClassPro: td.assetClassPro } : e) })), [mutate]);
  const deleteIsin = useCallback((id: string) => mutate(prev => ({ ...prev, isinLibrary: prev.isinLibrary.filter(e => e.id !== id) })), [mutate]);

  const summary = useMemo(() => {
    const assetsValue = state.assets.reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const assetsCost = state.assets.reduce((s, a) => s + (a.movements?.length ? calcInvestedFromMovements(a.movements) : a.buyPrice * a.shares), 0);
    const robosValue = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    const robosInvested = state.roboAdvisors.reduce((s, r) => s + r.investedValue, 0);
    const totalValue = assetsValue + robosValue + state.cashBalance;
    const totalInvested = assetsCost + robosInvested + state.cashBalance;
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? totalPL / totalInvested * 100 : 0;
    const dayChange = 0;
    return { totalValue, totalInvested, totalPL, totalPLPercent, dayChange, assetsValue, robosValue, cashBalance: state.cashBalance, xirr: 0 };
  }, [state]);

  const distribution = useMemo(() => {
    const val = (type: string) => state.assets.filter(a => a.type === type).reduce((s, a) => s + a.shares * a.currentPrice, 0);
    return [
      { name: 'Fondos MyInvestor', value: val('Fondos MyInvestor'), fill: '#22c55e' },
      { name: 'Fondos BBK', value: val('Fondos BBK'), fill: '#3b82f6' },
      { name: 'Robo-Advisors', value: state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0), fill: '#f59e0b' },
      { name: 'Acciones', value: val('Acciones'), fill: '#a855f7' },
      { name: 'Efectivo', value: state.cashBalance, fill: '#94a3b8' },
    ].filter(x => x.value > 0);
  }, [state]);

  const getXrayByEntity = useCallback((entity: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors') => {
    const geo: Record<string, number> = {}, sec: Record<string, number> = {}, acp: Record<string, number> = {};
    const add = (target: Record<string, number>, arr: { name: string; weight: number }[] | undefined, amount: number) => { if (arr?.length) arr.forEach(x => target[x.name] = (target[x.name] ?? 0) + amount * x.weight / 100); else target['Sin clasificar'] = (target['Sin clasificar'] ?? 0) + amount; };
    const addFrom = (amount: number, td?: ThreeDimensionClassification) => { add(geo, td?.geography, amount); add(sec, td?.sectors, amount); add(acp, td?.assetClassPro, amount); };
    const assets = entity === 'all' ? state.assets : entity === 'MyInvestor' ? state.assets.filter(a => a.type === 'Fondos MyInvestor') : entity === 'BBK' ? state.assets.filter(a => a.type === 'Fondos BBK') : [];
    assets.forEach(a => addFrom(a.shares * a.currentPrice, a.threeDim));
    const isinMap = new Map(state.isinLibrary.map(e => [e.isin, e]));
    const robos = entity === 'all' || entity === 'Robo-Advisors' ? state.roboAdvisors : [];
    robos.forEach(r => {
      if (r.subFunds?.length) r.subFunds.forEach(sf => addFrom(r.totalValue * sf.weightPct / 100, sf.threeDim ?? isinMap.get(sf.isin ?? '') ? { geography: (isinMap.get(sf.isin ?? '')?.geography ?? []), sectors: (isinMap.get(sf.isin ?? '')?.sectors ?? []), assetClassPro: (isinMap.get(sf.isin ?? '')?.assetClassPro ?? []) } : undefined));
      else addFrom(r.totalValue, r.threeDim);
    });
    if (entity === 'all' && state.cashBalance > 0) acp['Monetario'] = (acp['Monetario'] ?? 0) + state.cashBalance;
    return { geography: Object.entries(geo).map(([name, value]) => ({ name, value })), sectors: Object.entries(sec).map(([name, value]) => ({ name, value })), assetClassPro: Object.entries(acp).map(([name, value]) => ({ name, value })) };
  }, [state]);

  return { ...state, loading, summary, distribution, getXrayByEntity, addAsset, removeAsset, updateAsset, addMovement, removeMovement, addRoboAdvisor, updateRoboAdvisor, updateRoboThreeDim, updateRoboSubFunds, removeRoboAdvisor, setApiKey, setCashBalance, updatePrices, getByIsin, upsertIsin, updateIsinClassification, deleteIsin };
}