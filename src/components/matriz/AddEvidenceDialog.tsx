import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateEvidence } from '@/hooks/useCreateEvidence';
import { toast } from '@/hooks/use-toast';
import { 
  PILARES, 
  SOURCE_TYPES, 
  EVIDENCE_TYPES,
  type Pilar, 
  type SourceType, 
  type EvidenceType 
} from '@/lib/types';

interface AddEvidenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function AddEvidenceDialog({ open, onOpenChange, projectId }: AddEvidenceDialogProps) {
  const [content, setContent] = useState('');
  const [pilar, setPilar] = useState<Pilar | ''>('');
  const [sourceType, setSourceType] = useState<SourceType | ''>('');
  const [evidenceType, setEvidenceType] = useState<EvidenceType>('fato');
  const [divergenceDescription, setDivergenceDescription] = useState('');

  const createEvidenceMutation = useCreateEvidence();

  const isValid = content.trim() && pilar && sourceType;

  const resetForm = () => {
    setContent('');
    setPilar('');
    setSourceType('');
    setEvidenceType('fato');
    setDivergenceDescription('');
  };

  const handleSubmit = async () => {
    if (!isValid || !pilar || !sourceType) return;

    const sourceConfig = SOURCE_TYPES[sourceType];
    const sourceDescription = `${sourceConfig.icon} ${sourceConfig.label}`;

    try {
      await createEvidenceMutation.mutateAsync({
        project_id: projectId,
        pilar: pilar,
        content: content.trim(),
        source_description: sourceDescription,
        status: 'validado', // Manual evidences are automatically validated
        is_divergence: evidenceType === 'divergencia',
        divergence_description: evidenceType === 'divergencia' ? divergenceDescription : undefined,
        evidence_type: evidenceType,
      });

      toast({
        title: 'Evidência criada',
        description: `Nova evidência adicionada ao pilar ${PILARES[pilar].label}.`,
      });

      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro ao criar',
        description: 'Não foi possível criar a evidência.',
        variant: 'destructive',
      });
    }
  };

  const pilarOptions = Object.entries(PILARES) as [Pilar, typeof PILARES[Pilar]][];
  const sourceOptions = Object.entries(SOURCE_TYPES) as [SourceType, typeof SOURCE_TYPES[SourceType]][];
  const evidenceTypeOptions = Object.entries(EVIDENCE_TYPES) as [EvidenceType, typeof EVIDENCE_TYPES[EvidenceType]][];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Nova Evidência Manual
          </DialogTitle>
          <DialogDescription>
            Registre observações, notas de ligações ou insights que não vieram de arquivos gravados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="evidence-content">Conteúdo da Evidência *</Label>
            <Textarea
              id="evidence-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva a evidência observada..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Pilar */}
          <div className="space-y-2">
            <Label htmlFor="evidence-pilar">Pilar *</Label>
            <Select value={pilar} onValueChange={(value) => setPilar(value as Pilar)}>
              <SelectTrigger id="evidence-pilar">
                <SelectValue placeholder="Selecione o pilar" />
              </SelectTrigger>
              <SelectContent>
                {pilarOptions.map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Source Type */}
          <div className="space-y-2">
            <Label htmlFor="evidence-source">Fonte / Origem *</Label>
            <Select value={sourceType} onValueChange={(value) => setSourceType(value as SourceType)}>
              <SelectTrigger id="evidence-source">
                <SelectValue placeholder="Selecione a origem" />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Evidence Type */}
          <div className="space-y-2">
            <Label htmlFor="evidence-type">Tipo *</Label>
            <Select value={evidenceType} onValueChange={(value) => setEvidenceType(value as EvidenceType)}>
              <SelectTrigger id="evidence-type">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {evidenceTypeOptions.map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Divergence Description (conditional) */}
          <AnimatePresence>
            {evidenceType === 'divergencia' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 overflow-hidden"
              >
                <Label htmlFor="divergence-description">Descrição da Divergência</Label>
                <Textarea
                  id="divergence-description"
                  value={divergenceDescription}
                  onChange={(e) => setDivergenceDescription(e.target.value)}
                  placeholder="Explique a contradição encontrada..."
                  className="min-h-[80px] resize-none"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || createEvidenceMutation.isPending}
          >
            {createEvidenceMutation.isPending ? 'Salvando...' : 'Salvar Evidência'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
