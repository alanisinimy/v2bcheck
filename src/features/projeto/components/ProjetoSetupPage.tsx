import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SetupStepper } from './SetupStepper';
import { StepDadosProjeto, type ProjectFormData } from './StepDadosProjeto';
import { StepConfigurarPilares, SECTOR_TEMPLATES, type PilarConfig } from './StepConfigurarPilares';
import { StepConvidarEquipe, type Invite } from './StepConvidarEquipe';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const STEPS = [
  { label: 'Dados', description: 'Projeto & Cliente' },
  { label: 'Pilares', description: 'Framework' },
  { label: 'Equipe', description: 'Convites' },
];

export default function ProjetoSetupPage() {
  const navigate = useNavigate();
  const { addProject } = useProjectContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProjectFormData>({
    name: 'Diagnóstico Comercial',
    clientName: '',
    sector: '',
    companySize: '',
  });

  const [pilares, setPilares] = useState<PilarConfig[]>(SECTOR_TEMPLATES['outros']);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [prevSector, setPrevSector] = useState('');

  // Sync pilares template when sector changes
  const handleFormChange = useCallback((data: ProjectFormData) => {
    setFormData(data);
    if (data.sector && data.sector !== prevSector) {
      setPilares(SECTOR_TEMPLATES[data.sector] || SECTOR_TEMPLATES['outros']);
      setPrevSector(data.sector);
    }
  }, [prevSector]);

  const canAdvance = () => {
    if (currentStep === 0) return formData.clientName.trim() && formData.sector;
    return true;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addProject({
        name: formData.name.trim() || 'Diagnóstico Comercial',
        client_name: formData.clientName.trim(),
        description: formData.sector,
        sector: formData.sector,
        company_size: formData.companySize || undefined,
        custom_pilares: pilares,
      });

      // Insert invites if any
      if (invites.length > 0) {
        // Get the latest project (just created)
        const { data: projects } = await supabase
          .from('projects')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1);

        if (projects?.[0]) {
          const inviteRows = invites.map(i => ({
            project_id: projects[0].id,
            email: i.email,
            role: i.role,
          }));
          await supabase.from('project_invites').insert(inviteRows);
        }
      }

      toast({ title: 'Projeto criado!', description: `${formData.clientName} está pronto para o diagnóstico.` });
      navigate('/');
    } catch (error) {
      toast({ title: 'Erro ao criar projeto', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-card/50 px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Novo Diagnóstico</h1>
              <p className="text-xs text-muted-foreground">Configure seu projeto em 3 passos</p>
            </div>
          </div>
          <SetupStepper steps={STEPS} currentStep={currentStep} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 0 && (
              <StepDadosProjeto data={formData} onChange={handleFormChange} />
            )}
            {currentStep === 1 && (
              <StepConfigurarPilares
                sector={formData.sector}
                pilares={pilares}
                onChange={setPilares}
              />
            )}
            {currentStep === 2 && (
              <StepConvidarEquipe invites={invites} onChange={setInvites} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      <div className="border-t bg-card/50 px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep(s => s - 1)}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>

          {currentStep < 2 ? (
            <Button
              onClick={() => setCurrentStep(s => s + 1)}
              disabled={!canAdvance()}
              className="gap-2"
            >
              Próximo
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? 'Criando...' : (
                <>
                  <Rocket className="w-4 h-4" />
                  Criar Projeto
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
