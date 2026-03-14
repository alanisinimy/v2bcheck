import { useState, useEffect } from 'react';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { useUpdateProject } from '@/hooks/useUpdateProject';
import { StepConfigurarPilares, PilarConfig, SECTOR_TEMPLATES } from '@/features/projeto/components/StepConfigurarPilares';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export function PilaresTab() {
  const { currentProject } = useProjectContext();
  const updateProject = useUpdateProject();

  const sector = currentProject?.sector || 'outros';
  const defaultPilares = SECTOR_TEMPLATES[sector] || SECTOR_TEMPLATES.outros;
  const savedPilares = currentProject?.custom_pilares as PilarConfig[] | null;

  const [pilares, setPilares] = useState<PilarConfig[]>(savedPilares || defaultPilares);

  useEffect(() => {
    if (savedPilares) {
      setPilares(savedPilares);
    } else {
      setPilares(defaultPilares);
    }
  }, [currentProject?.id]);

  const handleSave = async () => {
    if (!currentProject) return;
    try {
      await updateProject.mutateAsync({
        projectId: currentProject.id,
        updates: { custom_pilares: pilares as any },
      });
      toast.success('Pilares atualizados com sucesso');
    } catch {
      toast.error('Erro ao salvar pilares');
    }
  };

  if (!currentProject) return null;

  return (
    <div className="space-y-6">
      <StepConfigurarPilares sector={sector} pilares={pilares} onChange={setPilares} />
      <div className="flex justify-center">
        <Button onClick={handleSave} disabled={updateProject.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar Pilares
        </Button>
      </div>
    </div>
  );
}
