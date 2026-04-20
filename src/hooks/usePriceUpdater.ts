import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type { Asset } from '@/types/portfolio';

type PriceUpdateItem = { assetId: string; name: string; ticker: string; marketSymbol?: string; oldPrice?: number; newPrice?: number; change?: number; changePct?: number; reason?: string; ok: boolean };

after = None
export function usePriceUpdater({ apiKey, assets, onUpdatePrices }: { apiKey: string; assets: Asset[]; onUpdatePrices: (prices: Record<string, number>, symbols: Record<string, string>) => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastResults, setLastResults] = useState<PriceUpdateItem[]>([]);

  const fetchJson = async (url: string) => { const r = await fetch(url); return { ok: r.ok, data: await r.json().catch(() => null) }; };
  const alphaSearch = async (isin: string) => {
    const q = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(isin)}&apikey=${apiKey}`;
    const { data } = await fetchJson(q);
    const matches = (data?.bestMatches ?? []) as any[];
    const pref = matches.find(m => /\.DEX|\.LON|\.EPA|\.AMS|\.MIL|\.PAR|\.STO/i.test(m['1. symbol'] ?? ''));
    return ((pref ?? matches[0])?.['1. symbol'] ?? null) as string | null;
  };
  const alphaPrice = async (symbol: string) => {
    const q = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const { data } = await fetchJson(q);
    const p = parseFloat(data?.['Global Quote']?.['05. price'] ?? '');
    return Number.isFinite(p) && p > 0 ? p : null;
  };
  const stooqPrice = async (symbol: string) => {
    const clean = symbol.toLowerCase().replace(/\.[a-z]+$/, '');
    const q = `https://stooq.com/q/l/?s=${encodeURIComponent(clean)}&f=sd2t2ohlcv&h&e=csv`;
    const res = await fetch(q);
    const txt = await res.text();
    const line = txt.trim().split('
')[1] || '';
    const cols = line.split(',');
    const p = parseFloat(cols[6] ?? '');
    return Number.isFinite(p) && p > 0 ? p : null;
  };
  const fallbackPrice = async (isin: string, ticker: string, symbol?: string) => {
    for (const s of [symbol, ticker, isin].filter(Boolean) as string[]) {
      const p = await stooqPrice(s).catch(() => null);
      if (p) return { p, symbol: s };
    }
    return null;
  };

  const updatePrices = useCallback(async () => {
    if (!assets.length) return;
    setIsUpdating(true); setProgress(0); setLastResults([]);
    const priceMap: Record<string, number> = {}; const symbolMap: Record<string, string> = {}; const results: PriceUpdateItem[] = [];
    const targets = [...new Map(assets.filter(a => ['Fondos MyInvestor', 'Fondos BBK'].includes(a.type) && a.isin).map(a => [a.isin!, a])).values()];
    for (let i = 0; i < targets.length; i++) {
      const a = targets[i]; const isin = a.isin!; const saved = a.marketSymbol;
      let symbol = saved || await alphaSearch(isin).catch(() => null);
      let price = null;
      if (symbol) price = await alphaPrice(symbol).catch(() => null);
      if (!price) {
        const fb = await fallbackPrice(isin, a.ticker, symbol || undefined).catch(() => null);
        if (fb) { price = fb.p; symbol = fb.symbol; }
      }
      if (price) {
        priceMap[a.ticker] = price; if (symbol) symbolMap[a.ticker] = symbol;
        results.push({ assetId: a.id, name: a.name, ticker: a.ticker, marketSymbol: symbol ?? undefined, oldPrice: a.currentPrice, newPrice: price, change: price - a.currentPrice, changePct: a.currentPrice > 0 ? ((price - a.currentPrice) / a.currentPrice) * 100 : 0, ok: true });
      } else {
        const sticky = a.currentPrice || 0;
        priceMap[a.ticker] = sticky;
        results.push({ assetId: a.id, name: a.name, ticker: a.ticker, reason: `Sin precio externo para ${isin}`, ok: false });
      }
      setProgress(Math.round(((i + 1) / targets.length) * 100));
    }
    onUpdatePrices(priceMap, symbolMap);
    setLastResults(results); setLastUpdated(new Date()); setIsUpdating(false); setProgress(0);
    const ok = results.filter(r => r.ok).length; const bad = results.length - ok;
    if (ok) toast.success(`${ok} precio${ok === 1 ? '' : 's'} actualizado${ok === 1 ? '' : 's'}${bad ? ` · ${bad} con fallback` : ''}`);
    else toast.error('No se pudo obtener ningún precio externo');
  }, [assets, onUpdatePrices]);

  return { updatePrices, isUpdating, progress, lastUpdated, lastResults };
}