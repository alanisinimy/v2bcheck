import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ExportJob {
  id: string;
  project_id: string;
  user_id: string;
  tipo: string;
  formato: string;
  status: string;
  file_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useExportJobs(projectId: string | undefined) {
  return useQuery({
    queryKey: ['export_jobs', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('export_jobs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as ExportJob[];
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data as ExportJob[] | undefined;
      const hasActive = data?.some(j => j.status === 'pendente' || j.status === 'gerando');
      return hasActive ? 3000 : false;
    },
  });
}

export function useCreateExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, tipo, formato }: { projectId: string; tipo: string; formato: string }) => {
      const { data, error } = await supabase.functions.invoke('generate-export', {
        body: { project_id: projectId, tipo, formato },
      });
      if (error) throw new Error(error.message || 'Export failed');
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; job_id: string; file_url: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['export_jobs', variables.projectId] });
    },
  });
}
