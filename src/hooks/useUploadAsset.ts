import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Asset, SourceType } from '@/lib/types';

interface UploadAssetData {
  projectId: string;
  file: File;
  sourceType: SourceType;
}

export function useUploadAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, file, sourceType }: UploadAssetData) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${projectId}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create asset record in database
      const { data: asset, error: insertError } = await supabase
        .from('assets')
        .insert({
          project_id: projectId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: fileName,
          status: 'processing',
          source_type: sourceType,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return asset as Asset;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets', data.project_id] });
    },
  });
}

export function useUpdateAssetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, status, projectId }: { assetId: string; status: Asset['status']; projectId: string }) => {
      const { data, error } = await supabase
        .from('assets')
        .update({ status })
        .eq('id', assetId)
        .select()
        .single();

      if (error) throw error;
      return { asset: data as Asset, projectId };
    },
    onSuccess: ({ projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['assets', projectId] });
    },
  });
}
