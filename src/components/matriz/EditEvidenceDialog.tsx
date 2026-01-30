import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PILARES, IMPACT_CONFIG, CRITICALITY_CONFIG, STATUS_CONFIG } from '@/lib/types';
import type { Evidence, Pilar, ImpactType, CriticalityType, EvidenceStatus } from '@/lib/types';

interface EditEvidenceDialogProps {
  evidence: Evidence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (evidenceId: string, updates: {
    content?: string;
    benchmark?: string;
    pilar?: Pilar;
    impact?: ImpactType;
    criticality?: CriticalityType;
    status?: EvidenceStatus;
  }) => void;
  isLoading?: boolean;
}

const pilares: Pilar[] = ['pessoas', 'processos', 'dados', 'tecnologia', 'gestao'];
const impacts: ImpactType[] = ['receita', 'eficiencia', 'risco'];
const criticalities: CriticalityType[] = ['alta', 'media', 'baixa'];
const statuses: EvidenceStatus[] = ['pendente', 'validado', 'rejeitado', 'investigar'];

export function EditEvidenceDialog({
  evidence,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: EditEvidenceDialogProps) {
  const [content, setContent] = useState('');
  const [benchmark, setBenchmark] = useState('');
  const [pilar, setPilar] = useState<Pilar>('pessoas');
  const [impact, setImpact] = useState<ImpactType | ''>('');
  const [criticality, setCriticality] = useState<CriticalityType>('media');
  const [status, setStatus] = useState<EvidenceStatus>('pendente');

  useEffect(() => {
    if (evidence) {
      setContent(evidence.content);
      setBenchmark(evidence.benchmark || '');
      setPilar(evidence.pilar);
      setImpact(evidence.impact || '');
      setCriticality(evidence.criticality || 'media');
      setStatus(evidence.status);
    }
  }, [evidence]);

  const handleSave = () => {
    if (!evidence) return;

    onSave(evidence.id, {
      content,
      benchmark: benchmark || undefined,
      pilar,
      impact: impact || undefined,
      criticality,
      status,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Evidência</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Gap Identificado */}
          <div className="grid gap-2">
            <Label htmlFor="content">Gap Identificado</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva o gap identificado..."
              rows={3}
            />
          </div>

          {/* Benchmark */}
          <div className="grid gap-2">
            <Label htmlFor="benchmark">Benchmark (O Ideal)</Label>
            <Textarea
              id="benchmark"
              value={benchmark}
              onChange={(e) => setBenchmark(e.target.value)}
              placeholder="O que deveria ser o correto..."
              rows={2}
            />
          </div>

          {/* Pilar and Impact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Pilar</Label>
              <Select value={pilar} onValueChange={(v) => setPilar(v as Pilar)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pilares.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PILARES[p].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Impacto</Label>
              <Select value={impact} onValueChange={(v) => setImpact(v as ImpactType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {impacts.map((i) => (
                    <SelectItem key={i} value={i}>
                      {IMPACT_CONFIG[i].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Criticality */}
          <div className="grid gap-2">
            <Label>Criticidade</Label>
            <RadioGroup
              value={criticality}
              onValueChange={(v) => setCriticality(v as CriticalityType)}
              className="flex gap-4"
            >
              {criticalities.map((c) => (
                <div key={c} className="flex items-center space-x-2">
                  <RadioGroupItem value={c} id={`crit-${c}`} />
                  <Label htmlFor={`crit-${c}`} className="font-normal cursor-pointer">
                    {CRITICALITY_CONFIG[c].label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label>Status</Label>
            <RadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as EvidenceStatus)}
              className="flex gap-4 flex-wrap"
            >
              {statuses.map((s) => (
                <div key={s} className="flex items-center space-x-2">
                  <RadioGroupItem value={s} id={`status-${s}`} />
                  <Label htmlFor={`status-${s}`} className="font-normal cursor-pointer">
                    {STATUS_CONFIG[s].label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !content.trim()}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
