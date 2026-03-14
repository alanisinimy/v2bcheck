import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UpdateProjectData {
  projectId: string;
  client_context?: string;
  main_pain_points?: string;
  project_goals?: string;
  custom_pilares?: any;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...data }: UpdateProjectData) => {
      const updatePayload: Record<string, any> = {};
      if (data.client_context !== undefined) updatePayload.client_context = data.client_context;
      if (data.main_pain_points !== undefined) updatePayload.main_pain_points = data.main_pain_points;
      if (data.project_goals !== undefined) updatePayload.project_goals = data.project_goals;
      if (data.custom_pilares !== undefined) updatePayload.custom_pilares = data.custom_pilares;

      const { data: project, error } = await supabase
        .from('projects')
        .update(updatePayload)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return project;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', data.id] });
    },
  });
}
