import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Asset, RoboAdvisor, PortfolioState, FundClassification,
  ThreeDimensionClassification, RoboSubFund, IsinEntry, RoboMovement,
} from '@/types/portfolio';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const EMPTY_STATE: PortfolioState = {
  assets: [],
  roboAdvisors: [],
  cashBalance: 0,
  apiKey: '',
  historicalData: [],
  isinLibrary: [],
};

function emptyThreeDim(): ThreeDimensionClassification {
  return { geography: [], sectors: [], assetClassPro: [] };
}

/**
 * Calcula el capital invertido neto desde movimientos.
 * Exportada para uso en FundsTable y TransactionHistory.
 */
export function calcInvestedFromMovements(movements: RoboMovement[]): number {
  if (!movements || movements.length === 0) return 0;
  return movements.reduce((total, mov) => {
    if (mov.category === 'aportacion') return total + mov.amount;
    if (mov.category === 'comision')   return total - mov.commission;
    return total;
  }, 0);
}

export function usePortfolio() {
//  const { user } = useAuth();
  const auth = useAuth();
const user = auth?.user; // Use nullish coalescing
  const isAuthLoading = auth?.loading ?? true;
  const [state, setState]     = useState<PortfolioState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data, error } = await (supabase
          .from('user_portfolio').select('data')
          .eq('user_id', user.id).maybeSingle() as any);
        if (error) { toast.error(`Error cargando cartera: ${error.message}`); return; }
        if (data?.data) {
          const parsed = data.data as Partial<PortfolioState>;
          setState({
            assets:         parsed.assets         || [],
            roboAdvisors:   parsed.roboAdvisors   || [],
            cashBalance:    parsed.cashBalance     ?? 0,
            apiKey:         parsed.apiKey          || '',
            historicalData: parsed.historicalData  || [],
            isinLibrary:    parsed.isinLibrary     || [],
          });
        }
      } catch (err: any) {
        toast.error(`Error cargando cartera: ${err?.message || 'Error desconocido'}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // ── Persistencia debounced 600ms ──────────────────────────────────────────
  const savePortfolio = useCallback((newState: PortfolioState) => {
    if (!user) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const { error } = await (supabase
        .from('user_portfolio')
        .upsert({ user_id: user.id, data: newState as any, updated_at: new Date().toISOString() }) as any);
      if (error) console.error('Error saving portfolio:', error.message);
    }, 600);
  }, [user]);

  const mutate = useCallback((updater: (prev: PortfolioState) => PortfolioState) => {
    setState(prev => {
      const next = updater(prev);
      savePortfolio(next);
      return next;
    });
  }, [savePortfolio]);

  // ── Assets ────────────────────────────────────────────────────────────────
  const addAsset = useCallback((asset: Omit<Asset, 'id'>) => {
    if (!user) return;
    const newAsset: Asset = { ...asset, id: crypto.randomUUID(), threeDim: asset.threeDim || emptyThreeDim() };
    mutate(prev => ({ ...prev, assets: [...prev.assets, newAsset] }));
  }, [user, mutate]);

  const removeAsset = useCallback((id: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, assets: prev.assets.filter(a => a.id !== id) }));
  }, [user, mutate]);

  const updateAsset = useCallback((id: string, updates: Partial<Asset>) => {
    if (!user) return;
    mutate(prev => ({ ...prev, assets: prev.assets.map(a => a.id === id ? { ...a, ...updates } : a) }));
  }, [user, mutate]);

  const updateAssetClassification = useCallback((id: string, classification: FundClassification) => {
    updateAsset(id, { classification });
  }, [updateAsset]);

  const updateAssetThreeDim = useCallback((id: string, threeDim: ThreeDimensionClassification) => {
    updateAsset(id, { threeDim });
  }, [updateAsset]);

  // ── Movimientos dentro del asset (NUEVO — faltaban en el repo) ────────────
  const addMovement = useCallback((assetId: string, movement: Omit<RoboMovement, 'id'>) => {
    if (!user) return;
    const newMovement: RoboMovement = { ...movement, id: crypto.randomUUID() };
    mutate(prev => ({
      ...prev,
      assets: prev.assets.map(a =>
        a.id === assetId
          ? { ...a, movements: [...(a.movements || []), newMovement] }
          : a
      ),
    }));
  }, [user, mutate]);

  const removeMovement = useCallback((assetId: string, movementId: string) => {
    if (!user) return;
    mutate(prev => ({
      ...prev,
      assets: prev.assets.map(a =>
        a.id === assetId
          ? { ...a, movements: (a.movements || []).filter(m => m.id !== movementId) }
          : a
      ),
    }));
  }, [user, mutate]);

  // ── Robo-Advisors ─────────────────────────────────────────────────────────
  const addRoboAdvisor = useCallback((robo: Omit<RoboAdvisor, 'id'>) => {
    if (!user) return;
    const newRobo: RoboAdvisor = { ...robo, id: crypto.randomUUID(), threeDim: robo.threeDim || emptyThreeDim() };
    mutate(prev => ({ ...prev, roboAdvisors: [...prev.roboAdvisors, newRobo] }));
  }, [user, mutate]);

  const updateRoboAdvisor = useCallback((id: string, updates: Partial<RoboAdvisor>) => {
    if (!user) return;
    mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.map(r => r.id === id ? { ...r, ...updates } : r) }));
  }, [user, mutate]);

  const updateRoboThreeDim = useCallback((id: string, threeDim: ThreeDimensionClassification) => {
    updateRoboAdvisor(id, { threeDim });
  }, [updateRoboAdvisor]);

  const updateRoboSubFunds = useCallback((id: string, subFunds: RoboSubFund[]) => {
    updateRoboAdvisor(id, { subFunds });
  }, [updateRoboAdvisor]);

  const removeRoboAdvisor = useCallback((id: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, roboAdvisors: prev.roboAdvisors.filter(r => r.id !== id) }));
  }, [user, mutate]);

  // ── Settings ──────────────────────────────────────────────────────────────
  const setApiKey = useCallback((apiKey: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, apiKey }));
  }, [user, mutate]);

  const setCashBalance = useCallback((cashBalance: number) => {
    if (!user) return;
    mutate(prev => ({ ...prev, cashBalance }));
  }, [user, mutate]);

  // FIX: acepta symbols opcional → permite persistir marketSymbol desde usePriceUpdater
  // Retrocompatible: SettingsPanel solo pasa prices (1 arg) y sigue funcionando
  const updatePrices = useCallback((
    prices:   Record<string, number>,
    symbols?: Record<string, string>
  ) => {
    if (!user) return;
    mutate(prev => ({
      ...prev,
      assets: prev.assets.map(a => {
        const newPrice  = prices[a.ticker];
        const newSymbol = symbols?.[a.ticker];
        if (newPrice === undefined && !newSymbol) return a;
        return {
          ...a,
          ...(newPrice  !== undefined ? { currentPrice:  newPrice  } : {}),
          ...(newSymbol               ? { marketSymbol:  newSymbol } : {}),
        };
      }),
    }));
  }, [user, mutate]);

  // ── ISIN Library ──────────────────────────────────────────────────────────
  const getByIsin = useCallback((isin: string): IsinEntry | undefined => {
    return state.isinLibrary.find(e => e.isin === isin);
  }, [state.isinLibrary]);

  const upsertIsin = useCallback((entry: Omit<IsinEntry, 'id'> & { id?: string }) => {
    if (!user) return;
    mutate(prev => {
      const existing = prev.isinLibrary.find(e => e.isin === entry.isin);
      if (existing) {
        return {
          ...prev,
          isinLibrary: prev.isinLibrary.map(e =>
            e.isin === entry.isin ? { ...e, ...entry, id: e.id } : e
          ),
        };
      }
      return { ...prev, isinLibrary: [...prev.isinLibrary, { ...entry, id: entry.id || crypto.randomUUID() }] };
    });
  }, [user, mutate]);

  const updateIsinClassification = useCallback((isin: string, threeDim: ThreeDimensionClassification) => {
    if (!user) return;
    mutate(prev => ({
      ...prev,
      isinLibrary: prev.isinLibrary.map(e =>
        e.isin === isin
          ? { ...e, geography: threeDim.geography, sectors: threeDim.sectors, assetClassPro: threeDim.assetClassPro }
          : e
      ),
    }));
  }, [user, mutate]);

  const deleteIsin = useCallback((id: string) => {
    if (!user) return;
    mutate(prev => ({ ...prev, isinLibrary: prev.isinLibrary.filter(e => e.id !== id) }));
  }, [user, mutate]);

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const assetsValue    = state.assets.reduce((s, a) => s + a.shares * a.currentPrice, 0);
    const assetsCost     = state.assets.reduce((s, a) => s + a.shares * a.buyPrice, 0);
    const robosValue     = state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0);
    const robosInvested  = state.roboAdvisors.reduce((s, r) => s + r.investedValue, 0);
    const totalValue     = assetsValue + robosValue + state.cashBalance;
    const totalInvested  = assetsCost  + robosInvested + state.cashBalance;
    const totalPL        = totalValue - totalInvested;
    const totalPLPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    const dayChange      = 0;

    let xirr = 0;
    if (totalInvested > 0 && state.assets.length > 0) {
      const today = new Date();
      let weightedDays = 0, totalWeight = 0;
      state.assets.forEach(asset => {
        const amount = asset.shares * asset.buyPrice;
        if (asset.buyDate) {
          const days = Math.max(1, (today.getTime() - new Date(asset.buyDate).getTime()) / 86400000);
          weightedDays += days * amount;
          totalWeight  += amount;
        }
      });
      const avgDays = totalWeight > 0 ? weightedDays / totalWeight : 365;
      xirr = avgDays > 0 ? (Math.pow(totalValue / totalInvested, 365 / avgDays) - 1) * 100 : 0;
    } else if (totalInvested > 0) {
      xirr = (Math.pow(totalValue / totalInvested, 1) - 1) * 100;
    }

    return { totalValue, totalInvested, totalPL, totalPLPercent, dayChange, assetsValue, robosValue, cashBalance: state.cashBalance, xirr };
  }, [state]);

  // ── Distribution ──────────────────────────────────────────────────────────
  const distribution = useMemo(() => {
    const val = (type: string) =>
      state.assets.filter(a => a.type === type).reduce((s, a) => s + a.shares * a.currentPrice, 0);
    return [
      { name: 'Fondos MyInvestor', value: val('Fondos MyInvestor'), fill: 'hsl(160, 84%, 39%)' },
      { name: 'Fondos BBK',        value: val('Fondos BBK'),        fill: 'hsl(217, 91%, 60%)' },
      { name: 'Robo-Advisors',     value: state.roboAdvisors.reduce((s, r) => s + r.totalValue, 0), fill: 'hsl(47, 96%, 53%)' },
      { name: 'Acciones',          value: val('Acciones'),          fill: 'hsl(280, 65%, 60%)' },
      { name: 'Efectivo',          value: state.cashBalance,        fill: 'hsl(0, 0%, 60%)'   },
    ].filter(d => d.value > 0);
  }, [state]);

  // ── X-Ray ─────────────────────────────────────────────────────────────────
  const getXrayByEntity = useCallback((entity: 'all' | 'MyInvestor' | 'BBK' | 'Robo-Advisors') => {
    const geoTotals:    Record<string, number> = {};
    const sectorTotals: Record<string, number> = {};
    const acpTotals:    Record<string, number> = {};

    const filteredAssets = entity === 'all' ? state.assets
      : entity === 'MyInvestor' ? state.assets.filter(a => a.type === 'Fondos MyInvestor')
      : entity === 'BBK'        ? state.assets.filter(a => a.type === 'Fondos BBK')
      : [];

    filteredAssets.forEach(a => {
      const value = a.shares * a.currentPrice;
      const td = a.threeDim;
      if (td?.geography?.length)    td.geography.forEach(g    => { geoTotals[g.name]    = (geoTotals[g.name]    || 0) + value * g.weight / 100; });
      else                           geoTotals['Sin clasificar']    = (geoTotals['Sin clasificar']    || 0) + value;
      if (td?.sectors?.length)      td.sectors.forEach(s      => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + value * s.weight / 100; });
      else                           sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + value;
      if (td?.assetClassPro?.length) td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + value * ac.weight / 100; });
      else                           acpTotals['Sin clasificar']   = (acpTotals['Sin clasificar']   || 0) + value;
    });

    const isinMap = new Map(state.isinLibrary.map(e => [e.isin, e]));
    const applyEntry = (entry: typeof state.isinLibrary[0] | undefined, amount: number) => {
      if (entry?.geography?.length)    entry.geography.forEach(g    => { geoTotals[g.name]    = (geoTotals[g.name]    || 0) + amount * g.weight / 100; });
      else                              geoTotals['Sin clasificar']    = (geoTotals['Sin clasificar']    || 0) + amount;
      if (entry?.sectors?.length)      entry.sectors.forEach(s      => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + amount * s.weight / 100; });
      else                              sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + amount;
      if (entry?.assetClassPro?.length) entry.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + amount * ac.weight / 100; });
      else                              acpTotals['Sin clasificar']   = (acpTotals['Sin clasificar']   || 0) + amount;
    };

    const filteredRobos = (entity === 'all' || entity === 'Robo-Advisors') ? state.roboAdvisors : [];
    filteredRobos.forEach(r => {
      if (r.subFunds?.length) {
        r.subFunds.forEach(sf =>
          applyEntry(sf.isin ? isinMap.get(sf.isin.toUpperCase()) : undefined, r.totalValue * sf.weightPct / 100)
        );
      } else {
        const td = r.threeDim;
        if (td?.geography?.length)    td.geography.forEach(g    => { geoTotals[g.name]    = (geoTotals[g.name]    || 0) + r.totalValue * g.weight / 100; });
        else                           geoTotals['Sin clasificar']    = (geoTotals['Sin clasificar']    || 0) + r.totalValue;
        if (td?.sectors?.length)      td.sectors.forEach(s      => { sectorTotals[s.name] = (sectorTotals[s.name] || 0) + r.totalValue * s.weight / 100; });
        else                           sectorTotals['Sin clasificar'] = (sectorTotals['Sin clasificar'] || 0) + r.totalValue;
        if (td?.assetClassPro?.length) td.assetClassPro.forEach(ac => { acpTotals[ac.name] = (acpTotals[ac.name] || 0) + r.totalValue * ac.weight / 100; });
        else                           acpTotals['Sin clasificar']   = (acpTotals['Sin clasificar']   || 0) + r.totalValue;
      }
    });

    if (entity === 'all' && state.cashBalance > 0) {
      acpTotals['Monetario'] = (acpTotals['Monetario'] || 0) + state.cashBalance;
    }

    const geoColors:    Record<string, string> = { 'EEUU':'hsl(210,80%,50%)', 'Europa':'hsl(160,84%,39%)', 'Emergentes':'hsl(25,95%,53%)', 'Japón':'hsl(0,70%,55%)', 'Asia-Pacífico':'hsl(280,65%,60%)', 'Global':'hsl(217,91%,60%)', 'Otro':'hsl(0,0%,60%)', 'Sin clasificar':'hsl(0,0%,50%)' };
    const sectorColors: Record<string, string> = { 'Tecnología':'hsl(260,70%,60%)', 'Salud':'hsl(340,75%,55%)', 'Financiero':'hsl(210,80%,50%)', 'Energía':'hsl(30,90%,50%)', 'Consumo':'hsl(160,70%,45%)', 'Industria':'hsl(190,70%,45%)', 'Infraestructuras':'hsl(180,60%,40%)', 'Commodities':'hsl(47,96%,53%)', 'Inmobiliario':'hsl(15,70%,50%)', 'Telecomunicaciones':'hsl(240,60%,55%)', 'Otro':'hsl(0,0%,60%)', 'Sin clasificar':'hsl(0,0%,50%)' };
    const acpColors:    Record<string, string> = { 'RV - Growth':'hsl(25,95%,53%)', 'RV - Value':'hsl(35,90%,50%)', 'RV - Large Cap':'hsl(15,85%,55%)', 'RV - Mid/Small Cap':'hsl(45,90%,50%)', 'RV - Blend':'hsl(20,95%,53%)', 'RF - Sovereign':'hsl(217,91%,60%)', 'RF - Corporate':'hsl(200,80%,55%)', 'RF - High Yield':'hsl(230,70%,55%)', 'RF - Corto Plazo':'hsl(195,75%,50%)', 'RF - Largo Plazo':'hsl(210,85%,50%)', 'Monetario':'hsl(160,84%,39%)', 'Commodities':'hsl(47,96%,53%)', 'Mixto':'hsl(280,65%,60%)', 'Sin clasificar':'hsl(0,0%,50%)' };

    const toItems = (totals: Record<string, number>, colors: Record<string, string>) =>
      Object.entries(totals).filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value, fill: colors[name] || 'hsl(0,0%,50%)' }));

    return {
      geography:     toItems(geoTotals,    geoColors),
      sector:        toItems(sectorTotals, sectorColors),
      assetClassPro: toItems(acpTotals,    acpColors),
    };
  }, [state]);

  // ── API pública ───────────────────────────────────────────────────────────
  return {
    ...state,
    loading,
    summary,
    distribution,
    getXrayByEntity,
    addAsset, removeAsset, updateAsset, updateAssetClassification, updateAssetThreeDim,
    addMovement, removeMovement,   // ← NUEVO: necesario para TransactionHistory
    addRoboAdvisor, updateRoboAdvisor, updateRoboThreeDim, updateRoboSubFunds, removeRoboAdvisor,
    setApiKey, setCashBalance, updatePrices,
    getByIsin, upsertIsin, updateIsinClassification, deleteIsin,
  };
}
