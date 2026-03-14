import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogEntry {
  id: string;
  project_id: string;
  actor_type: string;
  actor_name: string | null;
  action: string;
  description: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useActivityLog(projectId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['activity_log', projectId, limit],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLogEntry[];
    },
    enabled: !!projectId,
  });
}
