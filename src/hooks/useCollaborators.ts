import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface DiscProfile {
  dom: number;
  inf: number;
  est: number;
  conf: number;
}

export interface Collaborator {
  id: string;
  project_id: string;
  name: string;
  role: string | null;
  disc_profile: DiscProfile | null;
  profile_source: 'pdf_auto' | 'ai_inferred' | 'manual';
  primary_style: 'D' | 'I' | 'S' | 'C' | null;
  created_at: string;
  updated_at: string;
}

// Helper to safely parse disc_profile from Json
function parseDiscProfile(json: Json | null): DiscProfile | null {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;
  if (
    typeof obj.dom === 'number' &&
    typeof obj.inf === 'number' &&
    typeof obj.est === 'number' &&
    typeof obj.conf === 'number'
  ) {
    return {
      dom: obj.dom,
      inf: obj.inf,
      est: obj.est,
      conf: obj.conf,
    };
  }
  return null;
}

export function useCollaborators(projectId: string | undefined) {
  return useQuery({
    queryKey: ['collaborators', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((row) => ({
        ...row,
        disc_profile: parseDiscProfile(row.disc_profile),
        primary_style: row.primary_style as Collaborator['primary_style'],
      })) as Collaborator[];
    },
    enabled: !!projectId,
  });
}

interface CreateCollaboratorData {
  projectId: string;
  name: string;
  role?: string;
}

export function useCreateCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, name, role }: CreateCollaboratorData) => {
      const { data, error } = await supabase
        .from('collaborators')
        .insert({
          project_id: projectId,
          name,
          role,
          profile_source: 'manual' as const,
        })
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        disc_profile: parseDiscProfile(data.disc_profile),
        primary_style: data.primary_style as Collaborator['primary_style'],
      } as Collaborator;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', data.project_id] });
    },
  });
}

interface UpdateCollaboratorData {
  id: string;
  projectId: string;
  name?: string;
  role?: string;
  disc_profile?: DiscProfile;
  primary_style?: 'D' | 'I' | 'S' | 'C';
  profile_source?: 'pdf_auto' | 'ai_inferred' | 'manual';
}

export function useUpdateCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId, ...updates }: UpdateCollaboratorData) => {
      // Convert DiscProfile to Json-compatible format
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.disc_profile) {
        dbUpdates.disc_profile = updates.disc_profile as unknown as Json;
      }
      
      const { data, error } = await supabase
        .from('collaborators')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...data,
        disc_profile: parseDiscProfile(data.disc_profile),
        primary_style: data.primary_style as Collaborator['primary_style'],
        projectId,
      } as Collaborator & { projectId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', data.projectId] });
    },
  });
}

export function useDeleteCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', data.projectId] });
    },
  });
}

export function useInferProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, collaboratorId, collaboratorName }: {
      projectId: string;
      collaboratorId: string;
      collaboratorName: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('infer-disc-profile', {
        body: { projectId, collaboratorId, collaboratorName }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['evidences', variables.projectId] });
    },
  });
}

export interface TeamDistribution {
  D: number;
  I: number;
  S: number;
  C: number;
  total: number;
  percentages: {
    D: number;
    I: number;
    S: number;
    C: number;
  };
}

// Calculate team distribution
export function useTeamDistribution(collaborators: Collaborator[] | undefined): TeamDistribution {
  const counts = { D: 0, I: 0, S: 0, C: 0 };
  
  if (collaborators && collaborators.length > 0) {
    collaborators.forEach(c => {
      if (c.primary_style) {
        counts[c.primary_style]++;
      }
    });
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  
  return {
    ...counts,
    total,
    percentages: {
      D: total > 0 ? Math.round((counts.D / total) * 100) : 0,
      I: total > 0 ? Math.round((counts.I / total) * 100) : 0,
      S: total > 0 ? Math.round((counts.S / total) * 100) : 0,
      C: total > 0 ? Math.round((counts.C / total) * 100) : 0,
    }
  };
}
