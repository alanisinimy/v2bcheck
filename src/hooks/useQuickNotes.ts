import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface QuickNote {
  id: string;
  project_id: string;
  user_id: string;
  content_type: string;
  raw_content: string;
  processed_content: string | null;
  pilar_sugerido: string | null;
  status: string;
  created_at: string;
}

export function useQuickNotes(projectId: string | undefined) {
  return useQuery({
    queryKey: ['quick_notes', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('quick_notes')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as QuickNote[];
    },
    enabled: !!projectId,
  });
}

export function useCreateQuickNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, rawContent, contentType = 'texto' }: {
      projectId: string;
      rawContent: string;
      contentType?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: note, error } = await supabase
        .from('quick_notes')
        .insert({
          project_id: projectId,
          user_id: user.id,
          raw_content: rawContent,
          content_type: contentType,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger processing
      const { data: processResult, error: processError } = await supabase.functions.invoke('process-quick-note', {
        body: { note_id: (note as any).id, project_id: projectId },
      });

      if (processError) console.error('Quick note processing error:', processError);

      return { note: note as unknown as QuickNote, processResult };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quick_notes', variables.projectId] });
    },
  });
}
