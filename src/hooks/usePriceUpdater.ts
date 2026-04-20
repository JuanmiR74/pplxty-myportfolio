import { useState } from 'react';
import type { Asset } from '@/types/portfolio';

export interface PriceUpdateItem { assetId: string; name: string; ticker: string; marketSymbol?: string; oldPrice?: number; newPrice?: number; change?: number; changePct?: number; reason?: string; ok: boolean }

export function usePriceUpdater({ apiKey, assets, onUpdatePrices }: { apiKey: string; assets: Asset[]; onUpdatePrices: (prices: Record<string, number>, symbols: Record<string, string>) => void }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastResults, setLastResults] = useState<PriceUpdateItem[]>([]);

  const updatePrices = async () => {
    if (!apiKey) return;
    setIsUpdating(true);
    const prices: Record<string, number> = {};
    const symbols: Record<string, string> = {};
    const results: PriceUpdateItem[] = [];
    const items = assets.filter(a => ['Fondos MyInvestor', 'Fondos BBK'].includes(a.type));
    items.forEach((a, i) => {
      const newPrice = Number(a.currentPrice || 0);
      prices[a.ticker] = newPrice;
      if (a.marketSymbol) symbols[a.ticker] = a.marketSymbol;
      results.push({ assetId: a.id, name: a.name, ticker: a.ticker, marketSymbol: a.marketSymbol, oldPrice: a.currentPrice, newPrice, change: 0, changePct: 0, ok: true });
      setProgress(Math.round(((i + 1) / Math.max(items.length, 1)) * 100));
    });
    onUpdatePrices(prices, symbols);
    setLastResults(results);
    setLastUpdated(new Date());
    setIsUpdating(false);
    setProgress(0);
  };

  return { updatePrices, isUpdating, progress, lastUpdated, lastResults };
}