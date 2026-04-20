import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { Asset, IsinEntry, PortfolioState, RoboAdvisor, RoboMovement, ThreeDimensionClassification } from '@/types/portfolio';

const EMPTY: PortfolioState = { assets: [], roboAdvisors: [], cashBalance: 0, apiKey: '', historicalData: [], isinLibrary: [] };
const emptyThreeDim = (): ThreeDimensionClassification => ({ geography: [], sectors: [], assetClassPro: [] });

export function calcInvestedFromMovements(movements: RoboMovement[] = []) {
  return movements.reduce((acc, mov) => {
    if (mov.category === 'aportacion') return acc + mov.amount;
    if (mov.category === 'retirada') return acc - mov.amount;
    if (mov.category === 'comision') return acc - (mov.commission ?? mov.amount ?? 0);
    return acc;
  }, 0);
}

export function usePortfolio() {
  const { user } = useAuth();
  const [state, setState] = useState<PortfolioState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!user || !supabase) { setLoading(false); setState(EMPTY); return; }
    let active = true;
    (async () => {
      const { data } = await supabase.from('user_portfolio').select('data').eq('user_id', user.id).maybeSingle();
      if (!active) return;
      const parsed = (data as any)?.data ?? EMPTY;
      setState({ ...EMPTY, ...parsed });
      setLoading(false);
    })();
    return () => { active = false; }
  }, [user]);

  const persist = useCallback((next: PortfolioState) => {
    if (!user || !supabase) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      await supabase.from('user_portfolio').upsert({ user_id: user.id, data: next, updated_at: new Date().toISOString() });
    }, 300);
  }, [user]);

  const mutate = useCallback((updater: (prev: PortfolioState) => PortfolioState) => {
    setState(prev => {
      const next = updater(prev);
      persist(next);
      return next;
    });
  }, [persist]);

  const addAsset = useCallback((asset: Omit<Asset, 'id'>) => mutate(prev => ({ ...prev, assets: [...prev.assets, { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim ?? emptyThreeDim(), movements: asset.movements ?? [] }] })), [mutate]);
  const removeAsset = useCallback((id: string) => mutate(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) })), [mutate]);
  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a) })), [mutate]);
  const addMovement = useCallback((assetId: string, movement: Omit<RoboMovement, 'id'>) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === assetId ? { ...a, movements: [...(a.movements ?? []), { ...movement, id: crypto.randomUUID() }] } : a) })), [mutate]);
  const removeMovement = useCallback((assetId: string, movementId: string) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === assetId ? { ...a, movements: (a.movements ?? []).filter(m => m.id !== movementId) } : a) })), [mutate]);
  const addRoboAdvisor = useCallback((robo: Omit<RoboAdvisor, 'id'>) => mutate(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, { ...robo, id: crypto.randomUUID() }] })), [mutate]);
  const updateRoboAdvisor = useCallback((id: string, updates: Partial<RoboAdvisor>) => mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r) })), [mutate]);
  const removeRoboAdvisor = useCallback((id: string) => mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) })), [mutate]);
  const setApiKey = useCallback((apiKey: string) => mutate(prev => ({ ...prev, apiKey })), [mutate]);
  const setCashBalance = useCallback((cashBalance: number) => mutate(prev => ({ ...prev, cashBalance })), [mutate]);
  const updatePrices = useCallback((prices: Record<string, number>, symbols?: Record<string, string>) => mutate(prev => ({ ...prev, assets: prev.assets.map(a => ({ ...a, ...(prices[a.ticker] !== undefined ? { currentPrice: prices[a.ticker] } : {}), ...(symbols?.[a.ticker] ? { marketSymbol: symbols[a.ticker] } : {}) })) })), [mutate]);
  const getByIsin = useCallback((isin: string): IsinEntry | undefined => state.isinLibrary.find(e => e.isin === isin), [state.isinLibrary]);
  const upsertIsin = useCallback((entry: Omit<IsinEntry, 'id'> & { id?: string }) => mutate(prev => {
    const found = prev.isinLibrary.find(x => x.isin === entry.isin);
    if (found) return { ...prev, isinLibrary: prev.isinLibrary.map(x => x.isin === entry.isin ? { ...x, ...entry, id: x.id } : x) };
    return { ...prev, isinLibrary: [...prev.isinLibrary, { ...entry, id: entry.id ?? crypto.randomUUID() }] };
  }), [mutate]);

  const summary = useMemo(() => {
    const assetsValue = state.assets.reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const assetsCost = state.assets.reduce((s, a) => s + ((a.movements?.length ? calcInvestedFromMovements(a.movements) : a.buyPrice * a.shares)), 0);
    const robosValue = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    const robosInvested = state.roboAdvisors.reduce((s, r) => s + r.investedValue, 0);
    const totalValue = assetsValue + robosValue + state.cashBalance;
    const totalInvested = assetsCost + robosInvested + state.cashBalance;
    const totalPL = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? totalPL / totalInvested * 100 : 0;
    return { assetsValue, robosValue, totalValue, totalInvested, totalPL, totalPLPercent, cashBalance: state.cashBalance, xirr: 0, dayChange: 0 };
  }, [state]);

  const distribution = useMemo(() => {
    const sumType = (type: string) => state.assets.filter(a => a.type === type).reduce((s, a) => s + a.shares * a.currentPrice, 0);
    return [
      { name: 'Fondos MyInvestor', value: sumType('Fondos MyInvestor'), fill: '#22c55e' },
      { name: 'Fondos BBK', value: sumType('Fondos BBK'), fill: '#3b82f6' },
      { name: 'Robo-Advisors', value: state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0), fill: '#f59e0b' },
      { name: 'Acciones', value: sumType('Acciones'), fill: '#a855f7' },
      { name: 'Efectivo', value: state.cashBalance, fill: '#94a3b8' },
    ].filter(x => x.value > 0);
  }, [state]);

  const getXrayByEntity = useCallback((_entity: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors') => ({ geography: [], sector: [], assetClassPro: [] }), []);

  return { ...state, loading, summary, distribution, getXrayByEntity, addAsset, removeAsset, updateAsset, addMovement, removeMovement, addRoboAdvisor, updateRoboAdvisor, removeRoboAdvisor, setApiKey, setCashBalance, updatePrices, getByIsin, upsertIsin };
}