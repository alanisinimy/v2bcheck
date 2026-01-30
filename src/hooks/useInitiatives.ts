import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Pilar } from '@/lib/types';

export type InitiativeImpact = 'low' | 'medium' | 'high';
export type InitiativeEffort = 'low' | 'medium' | 'high';
export type InitiativeStatus = 'draft' | 'approved' | 'in_progress' | 'done';

export interface Initiative {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  reasoning: string | null;
  impact: InitiativeImpact;
  effort: InitiativeEffort;
  status: InitiativeStatus;
  target_pilar: Pilar | null;
  related_gaps: string[];
  expected_impact: string | null;
  sequential_id: number | null;
  created_at: string;
  updated_at: string;
}

export function useInitiatives(projectId: string | undefined) {
  return useQuery({
    queryKey: ['initiatives', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('initiatives')
        .select('*')
        .eq('project_id', projectId)
        .order('sequential_id', { ascending: true, nullsFirst: false });

      if (error) throw error;
      return data as Initiative[];
    },
    enabled: !!projectId,
  });
}

interface UpdateInitiativeData {
  id: string;
  projectId: string;
  title?: string;
  description?: string;
  status?: InitiativeStatus;
  impact?: InitiativeImpact;
  effort?: InitiativeEffort;
}

export function useUpdateInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: UpdateInitiativeData) => {
      const { data, error } = await supabase
        .from('initiatives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, projectId } as Initiative & { projectId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['initiatives', data.projectId] });
    },
  });
}

export function useDeleteInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('initiatives')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['initiatives', data.projectId] });
    },
  });
}

interface GeneratePlanResult {
  teamInsight: string;
  initiatives: Initiative[];
  stats: {
    validatedEvidences: number;
    collaborators: number;
    teamProfile: Record<string, number>;
  };
}

export function useGeneratePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string): Promise<GeneratePlanResult> => {
      const { data, error } = await supabase.functions.invoke('generate-strategic-plan', {
        body: { projectId }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['initiatives', projectId] });
    },
  });
}
