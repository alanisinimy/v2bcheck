import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Project, Asset, Evidence, EvidenceStatus, Pilar, ImpactType, CriticalityType } from '@/lib/types';

// Fetch all projects
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as Project[];
    },
  });
}

// Fetch single project with all related data
export function useProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

// Fetch assets for a project
export function useAssets(projectId: string | undefined) {
  return useQuery({
    queryKey: ['assets', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Asset[];
    },
    enabled: !!projectId,
  });
}

// Fetch evidences for a project
export function useEvidences(projectId: string | undefined) {
  return useQuery({
    queryKey: ['evidences', projectId],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      
      const { data, error } = await supabase
        .from('evidences')
        .select('*')
        .eq('project_id', projectId)
        .order('sequential_id', { ascending: true });
      
      if (error) throw error;
      return data as Evidence[];
    },
    enabled: !!projectId,
  });
}

// Update evidence status
export function useUpdateEvidenceStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ evidenceId, status }: { evidenceId: string; status: EvidenceStatus }) => {
      const { data, error } = await supabase
        .from('evidences')
        .update({ status })
        .eq('id', evidenceId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Evidence;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evidences', data.project_id] });
    },
  });
}

// Update evidence (all fields)
export function useUpdateEvidence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      evidenceId, 
      updates 
    }: { 
      evidenceId: string; 
      updates: {
        content?: string;
        benchmark?: string;
        pilar?: Pilar;
        impact?: ImpactType;
        criticality?: CriticalityType;
        status?: EvidenceStatus;
      }
    }) => {
      const { data, error } = await supabase
        .from('evidences')
        .update(updates)
        .eq('id', evidenceId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Evidence;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evidences', data.project_id] });
    },
  });
}

// Delete evidence
export function useDeleteEvidence() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ evidenceId, projectId }: { evidenceId: string; projectId: string }) => {
      const { error } = await supabase
        .from('evidences')
        .delete()
        .eq('id', evidenceId);
      
      if (error) throw error;
      return { evidenceId, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evidences', data.projectId] });
    },
  });
}

// Get statistics for dashboard
export function useProjectStats(projectId: string | undefined) {
  const { data: evidences } = useEvidences(projectId);
  
  if (!evidences) {
    return {
      total: 0,
      byPilar: {} as Record<Pilar, number>,
      byStatus: {} as Record<EvidenceStatus, number>,
      divergences: 0,
    };
  }
  
  const byPilar = evidences.reduce((acc, ev) => {
    acc[ev.pilar] = (acc[ev.pilar] || 0) + 1;
    return acc;
  }, {} as Record<Pilar, number>);
  
  const byStatus = evidences.reduce((acc, ev) => {
    acc[ev.status] = (acc[ev.status] || 0) + 1;
    return acc;
  }, {} as Record<EvidenceStatus, number>);
  
  return {
    total: evidences.length,
    byPilar,
    byStatus,
    divergences: evidences.filter(ev => ev.is_divergence).length,
  };
}

// Upload asset
export function useUploadAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: string; file: File }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Create asset record
      const { data, error } = await supabase
        .from('assets')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: fileName,
          status: 'processing',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Asset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets', data.project_id] });
    },
  });
}

// Update asset status
export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ assetId, status }: { assetId: string; status: Asset['status'] }) => {
      const { data, error } = await supabase
        .from('assets')
        .update({ status })
        .eq('id', assetId)
        .select()
        .single();
      
      if (error) throw error;
      return data as Asset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets', data.project_id] });
    },
  });
}

// Delete asset (storage file + evidences + asset record)
export function useDeleteAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ assetId, storagePath, projectId }: { assetId: string; storagePath: string; projectId: string }) => {
      // 1. Remove file from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([storagePath]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue even if storage delete fails (file might not exist)
      }
      
      // 2. Delete associated evidences
      const { error: evidencesError } = await supabase
        .from('evidences')
        .delete()
        .eq('asset_id', assetId);
      
      if (evidencesError) throw evidencesError;
      
      // 3. Delete asset record
      const { error: assetError } = await supabase
        .from('assets')
        .delete()
        .eq('id', assetId);
      
      if (assetError) throw assetError;
      
      return { assetId, projectId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets', data.projectId] });
      queryClient.invalidateQueries({ queryKey: ['evidences', data.projectId] });
    },
  });
}
