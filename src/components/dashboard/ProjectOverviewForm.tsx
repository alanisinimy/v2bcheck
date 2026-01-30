import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Building2, Target, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateProject } from '@/hooks/useUpdateProject';
import { toast } from '@/hooks/use-toast';
import type { Project } from '@/lib/types';

interface ProjectOverviewFormProps {
  project: Project;
}

export function ProjectOverviewForm({ project }: ProjectOverviewFormProps) {
  const [clientContext, setClientContext] = useState(project.client_context || '');
  const [mainPainPoints, setMainPainPoints] = useState(project.main_pain_points || '');
  const [projectGoals, setProjectGoals] = useState(project.project_goals || '');
  
  const updateProjectMutation = useUpdateProject();

  // Sync state when project changes
  useEffect(() => {
    setClientContext(project.client_context || '');
    setMainPainPoints(project.main_pain_points || '');
    setProjectGoals(project.project_goals || '');
  }, [project]);

  const hasChanges = 
    clientContext !== (project.client_context || '') ||
    mainPainPoints !== (project.main_pain_points || '') ||
    projectGoals !== (project.project_goals || '');

  const handleSave = async () => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId: project.id,
        client_context: clientContext,
        main_pain_points: mainPainPoints,
        project_goals: projectGoals,
      });

      toast({
        title: 'Contexto salvo',
        description: 'As informações do projeto foram atualizadas.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Client Context */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <Label htmlFor="client-context" className="text-lg font-semibold text-foreground">
              Contexto da Empresa
            </Label>
            <p className="text-sm text-muted-foreground">
              Descreva o cenário atual da empresa cliente
            </p>
          </div>
        </div>
        <Textarea
          id="client-context"
          value={clientContext}
          onChange={(e) => setClientContext(e.target.value)}
          placeholder="Ex: Empresa de tecnologia B2B com 50 funcionários, atuando há 8 anos no mercado. Recentemente expandiu para novos segmentos e enfrenta desafios de escala..."
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Pain Points */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-warning/10">
            <AlertCircle className="w-5 h-5 text-warning" />
          </div>
          <div>
            <Label htmlFor="pain-points" className="text-lg font-semibold text-foreground">
              Dores Latentes
            </Label>
            <p className="text-sm text-muted-foreground">
              Quais são as principais dores relatadas pelo cliente?
            </p>
          </div>
        </div>
        <Textarea
          id="pain-points"
          value={mainPainPoints}
          onChange={(e) => setMainPainPoints(e.target.value)}
          placeholder="Ex: Conversão baixa no funil de vendas, alto turnover de vendedores, falta de previsibilidade no pipeline..."
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Project Goals */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-soft">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-success/10">
            <Target className="w-5 h-5 text-success" />
          </div>
          <div>
            <Label htmlFor="project-goals" className="text-lg font-semibold text-foreground">
              Objetivos do Projeto
            </Label>
            <p className="text-sm text-muted-foreground">
              O que define sucesso neste diagnóstico?
            </p>
          </div>
        </div>
        <Textarea
          id="project-goals"
          value={projectGoals}
          onChange={(e) => setProjectGoals(e.target.value)}
          placeholder="Ex: Identificar gargalos no processo comercial, mapear gaps de competências do time, recomendar stack tecnológico adequado..."
          className="min-h-[120px] resize-none"
        />
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateProjectMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {updateProjectMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </motion.div>
  );
}
