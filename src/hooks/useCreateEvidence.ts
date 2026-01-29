import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Evidence, Pilar, EvidenceStatus } from '@/lib/types';

interface CreateEvidenceData {
  project_id: string;
  pilar: Pilar;
  content: string;
  source_description?: string;
  status?: EvidenceStatus;
  is_divergence?: boolean;
  divergence_description?: string;
  asset_id?: string;
  timecode_start?: number;
  timecode_end?: number;
}

export function useCreateEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateEvidenceData) => {
      const { data: evidence, error } = await supabase
        .from('evidences')
        .insert({
          project_id: data.project_id,
          pilar: data.pilar,
          content: data.content,
          source_description: data.source_description,
          status: data.status || 'pendente',
          is_divergence: data.is_divergence || false,
          divergence_description: data.divergence_description,
          asset_id: data.asset_id,
          timecode_start: data.timecode_start,
          timecode_end: data.timecode_end,
        })
        .select()
        .single();

      if (error) throw error;
      return evidence as Evidence;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evidences', data.project_id] });
    },
  });
}
