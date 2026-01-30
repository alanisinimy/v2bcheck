import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UpdateProjectData {
  projectId: string;
  client_context?: string;
  main_pain_points?: string;
  project_goals?: string;
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, ...data }: UpdateProjectData) => {
      const { data: project, error } = await supabase
        .from('projects')
        .update({
          client_context: data.client_context,
          main_pain_points: data.main_pain_points,
          project_goals: data.project_goals,
        })
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
