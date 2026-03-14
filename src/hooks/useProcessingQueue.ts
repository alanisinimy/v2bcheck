import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QueueItem {
  id: string;
  project_id: string;
  file_id: string;
  status: string;
  step_atual: string | null;
  progress_pct: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export function useProcessingQueue(projectId: string | undefined) {
  return useQuery({
    queryKey: ['processing_queue', projectId],
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('processing_queue')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as QueueItem[];
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      // Refetch every 3s if there are active items
      const data = query.state.data as QueueItem[] | undefined;
      const hasActive = data?.some(item =>
        item.status === 'na_fila' || item.status === 'processando'
      );
      return hasActive ? 3000 : false;
    },
  });
}

export function useActiveProcessing(projectId: string | undefined) {
  const { data: queue, ...rest } = useProcessingQueue(projectId);

  const activeItems = queue?.filter(item =>
    item.status === 'na_fila' || item.status === 'processando'
  ) || [];

  const completedItems = queue?.filter(item => item.status === 'concluido') || [];
  const errorItems = queue?.filter(item => item.status === 'erro') || [];

  return {
    ...rest,
    queue,
    activeItems,
    completedItems,
    errorItems,
    isProcessing: activeItems.length > 0,
    totalActive: activeItems.length,
  };
}
