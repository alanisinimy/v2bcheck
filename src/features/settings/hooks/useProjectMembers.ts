import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  created_at: string | null;
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);
      if (error) throw error;
      return data as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

export function useProjectInvites(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-invites', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      const { data, error } = await supabase
        .from('project_invites')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'pending');
      if (error) throw error;
      return data as ProjectInvite[];
    },
    enabled: !!projectId,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, email, role }: { projectId: string; email: string; role: string }) => {
      const { data, error } = await supabase
        .from('project_invites')
        .insert({ project_id: projectId, email, role })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-invites', data.project_id] });
    },
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId, projectId }: { inviteId: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_invites')
        .delete()
        .eq('id', inviteId);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-invites', data.projectId] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, projectId }: { memberId: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', data.projectId] });
    },
  });
}
