import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ExtractContextResponse {
  success: boolean;
  client_context: string;
  main_pain_points: string;
  project_goals: string;
  stats: {
    filesProcessed: number;
    charactersAnalyzed: number;
  };
  error?: string;
}

export function useExtractContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<ExtractContextResponse> => {
      const { data, error } = await supabase.functions.invoke(
        'extract-project-context',
        { body: { projectId } }
      );

      if (error) {
        throw new Error(error.message || 'Erro ao extrair contexto');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as ExtractContextResponse;
    },
    onSuccess: () => {
      // Invalidate projects query to refresh data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
