import { useState, useEffect } from 'react';
import {
  Trash2, Plus, Filter, Pencil, Check, X, History,
  RefreshCw, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';
import { Asset, AssetType, IsinEntry } from '@/types/portfolio';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TransactionHistory } from '@/components/portfolio/TransactionHistory';
import { calcInvestedFromMovements } from '@/hooks/usePortfolio';
import { usePriceUpdater, type PriceUpdateItem } from '@/hooks/usePriceUpdater';
import { toast } from 'sonner';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface Props {
  assets:         Asset[];
  onAdd:          (asset: Omit<Asset, 'id'>) => void;
  onRemove:       (id: string) => void;
  onUpdate:       (id: string, updates: Partial<Asset>) => void;
  onUpdatePrices: (prices: Record<string, number>, symbols: Record<string, string>) => void;
  apiKey:         string;
  getByIsin?:     (isin: string) => IsinEntry | undefined;
  upsertIsin?:    (entry: Omit<IsinEntry, 'id'> & { id?: string }) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}
function fmtPct(n: number) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

type EntityFilter = 'all' | 'MyInvestor' | 'BBK';

function getInvested(asset: Asset): number {
  if ((asset as any).movements?.length) return calcInvestedFromMovements((asset as any).movements);
  return asset.buyPrice * asset.shares;
}

// ---------------------------------------------------------------------------
// Modal de resultados de actualización
// ---------------------------------------------------------------------------
function PriceResultsModal({
  open, onClose, results, updatedAt,
}: {
  open:      boolean;
  onClose:   () => void;
  results:   PriceUpdateItem[];
  updatedAt: Date | null;
}) {
  const ok  = results.filter(r => r.ok)  as Extract<PriceUpdateItem, { ok: true }>[];
  const err = results.filter(r => !r.ok) as Extract<PriceUpdateItem, { ok: false }>[];

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            Resultado de la actualización
            {updatedAt && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {updatedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Resumen numérico */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg bg-green-500/10 p-3 text-center">
            <p className="text-2xl font-bold font-mono text-green-500">{ok.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Actualizados</p>
          </div>
          <div className="rounded-lg bg-red-500/10 p-3 text-center">
            <p className="text-2xl font-bold font-mono text-red-500">{err.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Con errores</p>
          </div>
        </div>

        {/* Precios actualizados */}
        {ok.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Precios actualizados
            </p>
            {ok.map(r => (
              <div key={r.assetId}
                className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                <div>
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge variant="secondary" className="font-mono text-[10px] ml-2">{r.marketSymbol}</Badge>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-semibold">{fmt(r.newPrice)}</span>
                  <span className={`text-xs font-mono ml-2 ${r.changePct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {fmtPct(r.changePct)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Errores */}
        {err.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Errores
            </p>
            {err.map(r => (
              <div key={r.assetId}
                className="flex items-start gap-2 py-1.5 border-b border-border/30 last:border-0">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function FundsTable({
  assets, onAdd, onRemove, onUpdate, onUpdatePrices, apiKey, getByIsin, upsertIsin,
}: Props) {
  const [open,         setOpen]         = useState(false);
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [historyAssetId, setHistoryAssetId] = useState<string | null>(null);
  const [showResults,  setShowResults]  = useState(false);
  const [wasUpdating,  setWasUpdating]  = useState(false);
  
  const [editForm, setEditForm] = useState({
    name: '', ticker: '', shares: '', buyPrice: '', currentPrice: '', marketSymbol: '',
  });
  
  const [form, setForm] = useState({
    name: '', ticker: '', type: 'Fondos MyInvestor' as AssetType,
    shares: '', buyPrice: '', currentPrice: '',
  });

  // Hook de precios
  const { updatePrices, isUpdating, progress, lastUpdated, lastResults } =
    usePriceUpdater({ apiKey, assets, onUpdatePrices });

  // Abrir modal cuando termina la actualización y hay resultados
  useEffect(() => {
    if (isUpdating) { setWasUpdating(true); return; }
    if (wasUpdating && lastResults.length > 0) {
      setShowResults(true);
      setWasUpdating(false);
    }
  }, [isUpdating, wasUpdating, lastResults.length]);

  // Resolver el asset fresco desde la prop assets
  const historyAsset = historyAssetId
    ? assets.find(a => a.id === historyAssetId) ?? null
    : null;

  // Filtrado por entidad
  const filtered = entityFilter === 'all'
    ? assets.filter(a => a.type === 'Fondos MyInvestor' || a.type === 'Fondos BBK')
    : assets.filter(a => a.type === (entityFilter === 'MyInvestor' ? 'Fondos MyInvestor' : 'Fondos BBK'));

  // Totales
  const totalValue    = filtered.reduce((s, a) => s + a.shares * a.currentPrice, 0);
  const totalInvested = filtered.reduce((s, a) => s + getInvested(a), 0);
  const totalPL       = totalValue - totalInvested;

  // Fondos actualizables (solo tipos fondo, con ISIN)
  const updatableCount = assets.filter(
    a => ['Fondos MyInvestor', 'Fondos BBK'].includes(a.type) && (a.isin || a.ticker) && a.shares > 0
  ).length;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleIsinBlur = () => {
    if (!getByIsin || !form.ticker.trim()) return;
    const entry = getByIsin(form.ticker.trim().toUpperCase());
    if (entry) {
      setForm(prev => ({
        ...prev,
        name: prev.name || entry.name,
        type: (prev.type || entry.assetType) as AssetType,
      }));
      toast.info('Datos recuperados de la librería ISIN');
    }
  };

  const handleSubmit = () => {
    if (!form.name || !form.ticker || !form.shares || !form.buyPrice) return;
    const isin = form.ticker.toUpperCase();
    onAdd({
      name: form.name, ticker: isin, isin, type: form.type,
      shares: parseFloat(form.shares), 
      buyPrice: parseFloat(form.buyPrice),
      currentPrice: parseFloat(form.currentPrice || '0'),
    } as any);
    upsertIsin?.({ isin, name: form.name, assetType: form.type, geography: [], sectors: [], assetClassPro: [] });
    setForm({ name: '', ticker: '', type: 'Fondos MyInvestor', shares: '', buyPrice: '', currentPrice: '' });
    setOpen(false);
  };

  const startEditing = (a: Asset) => {
    setEditingId(a.id);
    setEditForm({
      name:         a.name,
      ticker:       (a.isin || a.ticker || '').toUpperCase(),
      shares:       a.shares.toString(),
      buyPrice:     (a.buyPrice * a.shares).toString(),
      currentPrice: a.currentPrice.toString(),
      marketSymbol: (a as any).marketSymbol || '',
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim() || !editForm.ticker.trim()) {
      toast.error('El nombre y el ISIN son obligatorios');
      return;
    }
    const normalizedIsin = editForm.ticker.trim().toUpperCase();
    const investedAmount = parseFloat(editForm.buyPrice);
    const shares = parseFloat(editForm.shares);
    const buyPricePerShare = shares > 0 ? investedAmount / shares : 0;
    
    onUpdate(id, {
      name:         editForm.name.trim(),
      ticker:       normalizedIsin,
      isin:         normalizedIsin,
      shares:       shares,
      buyPrice:     buyPricePerShare,
      currentPrice: parseFloat(editForm.currentPrice),
      ...(editForm.marketSymbol.trim() ? { marketSymbol: editForm.marketSymbol.trim() } : {}),
    } as any);
    setEditingId(null);
  };

  const getEntity = (type: AssetType) => {
    if (type === 'Fondos MyInvestor') return 'MyInvestor';
    if (type === 'Fondos BBK') return 'BBK';
    return type;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <Card className="border-border/50 bg-card/80 backdrop-blur">

        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">Fondos de Inversión</CardTitle>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro */}
            <div className="flex items-center gap-1.5">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={entityFilter} onValueChange={v => setEntityFilter(v as EntityFilter)}>
                <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Ver Todo</SelectItem>
                  <SelectItem value="MyInvestor">MyInvestor</SelectItem>
                  <SelectItem value="BBK">BBK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botón actualizar precios */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline" size="sm" className="gap-1.5 h-8"
                  onClick={updatePrices}
                  disabled={isUpdating || updatableCount === 0}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
                  {isUpdating ? `Actualizando… ${progress}%` : 'Actualizar precios'}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs">
                {!apiKey
                  ? '⚠ Configura tu Alpha Vantage API Key en Configuración'
                  : updatableCount === 0
                  ? 'No hay fondos MyInvestor/BBK con ISIN o ticker'
                  : `Actualiza ${updatableCount} fondo${updatableCount !== 1 ? 's' : ''} · Fondos con símbolo guardado usan 1 llamada en vez de 2`}
              </TooltipContent>
            </Tooltip>

            {/* Ver últimos resultados */}
            {lastResults.length > 0 && !isUpdating && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs"
                onClick={() => setShowResults(true)}>
                {lastResults.some(r => !r.ok)
                  ? <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                  : <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                Ver resultados
              </Button>
            )}

            {/* Añadir fondo */}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1 h-8"><Plus className="h-4 w-4" /> Añadir</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Añadir Fondo</DialogTitle></DialogHeader>
                <div className="grid gap-3">
                  <div><Label>Nombre</Label>
                    <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Fidelity MSCI World" />
                  </div>
                  <div><Label>ISIN / Ticker</Label>
                    <Input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value })}
                      onBlur={handleIsinBlur} placeholder="Ej: IE00BYX5NX33" />
                  </div>
                  <div><Label>Entidad</Label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as AssetType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fondos MyInvestor">MyInvestor</SelectItem>
                        <SelectItem value="Fondos BBK">BBK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Total Invertido (€)</Label>
                      <Input type="number" value={form.buyPrice} onChange={e => setForm({ ...form, buyPrice: e.target.value })} placeholder="Ej: 5000" />
                    </div>
                    <div><Label>Nº Participaciones</Label>
                      <Input type="number" value={form.shares} onChange={e => setForm({ ...form, shares: e.target.value })} />
                    </div>
                  </div>
                  <div><Label>Precio Actual (€/participación)</Label>
                    <Input type="number" value={form.currentPrice} onChange={e => setForm({ ...form, currentPrice: e.target.value })} />
                  </div>
                  <Button onClick={handleSubmit}>Guardar Fondo</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          {/* Barra de progreso */}
          {isUpdating && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Consultando Alpha Vantage…</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {/* Totales */}
          <div className="flex items-center gap-4 mb-4 text-sm border-b pb-3 border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">Inversión Real</span>
              <span className="font-mono font-bold text-lg">{fmt(totalInvested)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">Valor Actual</span>
              <span className="font-mono font-bold text-lg">{fmt(totalValue)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase">Plusvalía</span>
              <span className={`font-mono font-bold text-lg ${totalPL >= 0 ? 'text-profit' : 'text-loss'}`}>
                {totalPL >= 0 ? '+' : ''}{fmt(totalPL)}
              </span>
            </div>
          </div>

          {/* Tabla */}
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Fondo / ISIN</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>
                  <Tooltip>
                    <TooltipTrigger className="cursor-help underline decoration-dotted text-left">
                      Símbolo
                    </TooltipTrigger>
                    <TooltipContent className="text-xs max-w-[220px]">
                      Símbolo de mercado (ej. VWCE.DEX). Si está relleno, la actualización de precios lo usa directamente sin buscar, ahorrando llamadas a la API.
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="text-right">Aportado</TableHead>
                <TableHead className="text-right">Uds.</TableHead>
                <TableHead className="text-right">Precio Act.</TableHead>
                <TableHead className="text-right">Valor Act.</TableHead>
                <TableHead className="text-right">Rentabilidad</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(a => {
                const isEditing    = editingId === a.id;
                const invested     = isEditing ? parseFloat(editForm.buyPrice) : getInvested(a);
                const shares       = isEditing ? parseFloat(editForm.shares) : a.shares;
                const currentPrice = isEditing ? parseFloat(editForm.currentPrice) : a.currentPrice;
                const currentVal   = (shares * currentPrice) || 0;
                const profitEuro   = currentVal - invested;
                const profitPct    = invested > 0 ? (profitEuro / invested) * 100 : 0;
                const hasMovements = ((a as any).movements?.length ?? 0) > 0;
                const marketSymbol = (a as any).marketSymbol as string | undefined;

                return (
                  <TableRow key={a.id} className={isEditing ? 'bg-muted/30' : ''}>
                    {/* Nombre + ISIN */}
                    <TableCell>
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <Input
                            className="h-7 text-xs"
                            value={editForm.name}
                            placeholder="Nombre del fondo"
                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          />
                          <Input
                            className="h-7 text-xs font-mono uppercase"
                            value={editForm.ticker}
                            placeholder="ISIN"
                            onChange={e => setEditForm({ ...editForm, ticker: e.target.value.toUpperCase() })}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span className="font-medium text-sm line-clamp-1">{a.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase">{a.ticker}</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Entidad */}
                    <TableCell>
                      <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">{getEntity(a.type)}</span>
                    </TableCell>

                    {/* Símbolo de mercado — editable en modo edición */}
                    <TableCell>
                      {isEditing ? (
                        <Input
                          className="h-7 w-28 text-xs font-mono"
                          placeholder="VWCE.DEX"
                          value={editForm.marketSymbol}
                          onChange={e => setEditForm({ ...editForm, marketSymbol: e.target.value.toUpperCase() })}
                        />
                      ) : marketSymbol ? (
                        <Badge variant="secondary" className="font-mono text-[10px]">{marketSymbol}</Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">—</span>
                      )}
                    </TableCell>

                    {/* Aportado */}
                    <TableCell className="text-right font-mono text-sm">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">{fmt(invested)}</span>
                        {hasMovements && (
                          <span className="text-[10px] text-muted-foreground">
                            {(a as any).movements.length} mov.
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Unidades */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {isEditing
                        ? <Input className="h-7 w-20 text-right text-xs ml-auto" type="number"
                            value={editForm.shares} onChange={e => setEditForm({ ...editForm, shares: e.target.value })} />
                        : a.shares.toFixed(4)}
                    </TableCell>

                    {/* Precio actual */}
                    <TableCell className="text-right font-mono text-xs text-muted-foreground">
                      {isEditing
                        ? <Input className="h-7 w-24 text-right text-xs ml-auto" type="number"
                            value={editForm.currentPrice} onChange={e => setEditForm({ ...editForm, currentPrice: e.target.value })} />
                        : <span className={isUpdating && a.isin ? 'animate-pulse' : ''}>{fmt(currentPrice)}</span>}
                    </TableCell>

                    {/* Valor actual */}
                    <TableCell className="text-right font-mono font-semibold text-sm">{fmt(currentVal)}</TableCell>

                    {/* Rentabilidad */}
                    <TableCell className={`text-right font-mono font-bold text-sm ${profitEuro >= 0 ? 'text-profit' : 'text-loss'}`}>
                      <div className="flex flex-col items-end">
                        <span>{profitEuro >= 0 ? '+' : ''}{fmt(profitEuro)}</span>
                        <span className="text-[10px] opacity-80">{profitPct.toFixed(2)}%</span>
                      </div>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {isEditing ? (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-profit"
                              onClick={() => handleSaveEdit(a.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                              onClick={() => setEditingId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              title="Historial de movimientos"
                              onClick={() => setHistoryAssetId(a.id)}>
                              <History className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => startEditing(a)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-loss"
                              onClick={() => onRemove(a.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-sm">
                    No hay fondos. Pulsa «Añadir» para crear el primero.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Dialog historial — pasa el asset FRESCO (resuelto en cada render) */}
        <Dialog
          open={historyAssetId !== null}
          onOpenChange={isOpen => { if (!isOpen) setHistoryAssetId(null); }}
        >
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Historial · {historyAsset?.name}</DialogTitle>
            </DialogHeader>
            {historyAsset && (
              <TransactionHistory asset={historyAsset} onInvestedChanged={() => {}} />
            )}
          </DialogContent>
        </Dialog>

        {/* Modal resultados actualización */}
        <PriceResultsModal
          open={showResults}
          onClose={() => setShowResults(false)}
          results={lastResults}
          updatedAt={lastUpdated}
        />
      </Card>
    </TooltipProvider>
  );
}
