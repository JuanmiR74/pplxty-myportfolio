import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  user_id: string;
  asset_id?: string;
  robo_advisor_id?: string;
  amount: number;
  date: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export function useTransactions() {
  const { user } = useAuth();

  const fetchTransactions = async (assetId?: string, roboAdvisorId?: string): Promise<Transaction[]> => {
    // Protección contra usuario no autenticado (evita error de null)
    if (!user?.id) return [];

    try {
      let query = (supabase
        .from('transactions') as any)
        .select('*')
        .eq('user_id', user.id);

      if (assetId) {
        query = query.eq('asset_id', assetId);
      } else if (roboAdvisorId) {
        query = query.eq('robo_advisor_id', roboAdvisorId);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) {
        toast.error(`Error cargando transacciones: ${error.message}`);
        throw error;
      }
      return (data || []) as Transaction[];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  };

  const calculateInvested = async (assetId?: string, roboAdvisorId?: string): Promise<number> => {
    const transactions = await fetchTransactions(assetId, roboAdvisorId);
    return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) {
      toast.error('Debes iniciar sesión para añadir transacciones');
      return null;
    }

    try {
      const { data, error } = await (supabase
        .from('transactions') as any)
        .insert({
          ...transaction,
          user_id: user.id,
        })
        .select()
        .maybeSingle();

      if (error) {
        toast.error(`Error añadiendo transacción: ${error.message}`);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const updateTransaction = async (id: string, updates: Partial<Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    if (!user?.id) return null;

    try {
      const { data, error } = await (supabase
        .from('transactions') as any)
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) {
        toast.error(`Error actualizando transacción: ${error.message}`);
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user?.id) return;

    try {
      const { error } = await (supabase
        .from('transactions') as any)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        toast.error(`Error eliminando transacción: ${error.message}`);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  };

  return {
    fetchTransactions,
    calculateInvested,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
