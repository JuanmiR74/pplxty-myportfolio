// =============================================================================
// TransactionHistory.tsx
//
// FIX refresco: en lugar de leer asset.movements de la prop (que es un objeto
// congelado en el momento de abrir el dialog), se lee directamente del estado
// global de usePortfolio buscando el asset por id. Así cada vez que
// addMovement/removeMovement muta el estado, el componente ve los datos frescos
// sin necesidad de cerrar y reabrir el dialog.
// =============================================================================

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePortfolio, calcInvestedFromMovements } from '@/hooks/usePortfolio';
import type { Asset, RoboMovement } from '@/types/portfolio';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

type MovementCategory = RoboMovement['category'];

const CATEGORY_LABELS: Record<MovementCategory, string> = {
  aportacion: 'Aportación',
  comision:   'Comisión',
  fondo:      'Fondo',
  intereses:  'Intereses',
  otro:       'Otro',
};

// ---------------------------------------------------------------------------
// Props — solo necesitamos el id del asset, no el objeto completo congelado
// ---------------------------------------------------------------------------
interface Props {
  asset:              Asset;          // usado solo para id y name inicial
  onInvestedChanged?: (amount: number) => void;
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------
export function TransactionHistory({ asset, onInvestedChanged }: Props) {
  const portfolio = usePortfolio();

  // ── Leer el asset FRESCO del estado global en cada render ─────────────────
  // Esto es el fix del refresco: no usamos asset.movements de la prop,
  // sino que buscamos el asset actualizado en el estado vivo del hook.
  const liveAsset   = portfolio.assets.find(a => a.id === asset.id) ?? asset;
  const movements   = (liveAsset.movements || []) as RoboMovement[];
  const totalInvested = calcInvestedFromMovements(movements);

  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    date:        new Date().toISOString().split('T')[0],
    category:    'aportacion' as MovementCategory,
    amount:      '',
    description: '',
  });

  // ── Añadir movimiento ─────────────────────────────────────────────────────
  const handleAdd = async () => {
    const amount = parseFloat(form.amount);
    if (!form.date || isNaN(amount) || amount <= 0) {
      toast.error('Introduce una fecha y un importe válido (mayor que 0)');
      return;
    }

    setSaving(true);
    try {
      portfolio.addMovement(asset.id, {
        date:        form.date,
        description: form.description.trim() || CATEGORY_LABELS[form.category],
        amount,
        commission:  form.category === 'comision' ? amount : 0,
        category:    form.category,
      });

      // Calcular nuevo total optimista para notificar al padre si lo necesita
      const newTotal =
        form.category === 'aportacion' ? totalInvested + amount
        : form.category === 'comision' ? totalInvested - amount
        : totalInvested;
      onInvestedChanged?.(newTotal);

      // Reset form
      setForm({
        date:        new Date().toISOString().split('T')[0],
        category:    'aportacion',
        amount:      '',
        description: '',
      });
      setShowForm(false);
      toast.success('Movimiento añadido');
    } catch (err) {
      toast.error('Error al añadir el movimiento');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar movimiento ───────────────────────────────────────────────────
  const handleRemove = (movementId: string) => {
    portfolio.removeMovement(asset.id, movementId);
    const remaining = movements.filter(m => m.id !== movementId);
    onInvestedChanged?.(calcInvestedFromMovements(remaining));
    toast.success('Movimiento eliminado');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Capital invertido</p>
          <p className="text-xl font-mono font-bold">{fmt(totalInvested)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Añadir movimiento
        </Button>
      </div>

      {/* Lista de movimientos */}
      {movements.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Sin movimientos registrados. Añade una aportación para empezar.
        </p>
      ) : (
        <div className="rounded-md border border-border/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Fecha</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Tipo</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground uppercase">Importe</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Descripción</th>
                <th className="px-3 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {[...movements]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(m => {
                  const isIn  = m.category === 'aportacion' || m.category === 'intereses';
                  const isOut = m.category === 'comision';
                  return (
                    <tr key={m.id} className="border-t border-border/30 hover:bg-muted/20">
                      <td className="px-3 py-2 font-mono text-xs">{m.date}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isIn  ? 'bg-green-500/10 text-green-500'
                          : isOut ? 'bg-red-500/10 text-red-500'
                          : 'bg-muted text-muted-foreground'
                        }`}>
                          {CATEGORY_LABELS[m.category] ?? m.category}
                        </span>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono font-semibold ${
                        isIn ? 'text-green-500' : isOut ? 'text-red-500' : ''
                      }`}>
                        {isOut ? '-' : '+'}{fmt(m.amount)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {m.description || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost" size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(m.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dialog añadir */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Añadir movimiento · {liveAsset.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.category}
                  onValueChange={v => setForm(f => ({ ...f, category: v as MovementCategory }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(CATEGORY_LABELS) as [MovementCategory, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Importe (€)</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="5000.00"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descripción <span className="text-muted-foreground">(opcional)</span></Label>
              <Input
                placeholder="Aportación mensual…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
