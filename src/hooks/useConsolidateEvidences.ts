import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ConsolidationGroup {
  winner_id: string;
  redundant_ids: string[];
  reason: string;
}

interface ConsolidationStats {
  total_analyzed: number;
  groups_found: number;
  evidences_archived: number;
}

export interface PilarCoverage {
  pilar: string;
  label: string;
  peso: number;
  peso_pct: number;
  gaps_count: number;
  validados_count: number;
  cobertura_pct: number;
  status: 'adequada' | 'parcial' | 'insuficiente';
}

interface ConsolidationResult {
  success: boolean;
  consolidations: ConsolidationGroup[];
  stats: ConsolidationStats;
  cobertura_por_pilar: PilarCoverage[];
  alertas: string[];
  error?: string;
}

export function useConsolidateEvidences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<ConsolidationResult> => {
      const { data, error } = await supabase.functions.invoke('consolidate-evidences', {
        body: { projectId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to consolidate evidences');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data as ConsolidationResult;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['evidences', projectId] });
    },
  });
}
