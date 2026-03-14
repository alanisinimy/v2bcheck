import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  FileText,
  Presentation,
  Download,
  Lock,
  Check,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';

type ExportFormat = 'pdf' | 'xlsx' | 'pptx';

interface DeliverableConfig {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  formats: ExportFormat[];
  defaultFormat: ExportFormat;
}

const DELIVERABLES: DeliverableConfig[] = [
  {
    id: 'matriz',
    title: 'Matriz de Gaps',
    description: 'Todos os gaps validados organizados por pilar com criticidade e benchmarks.',
    icon: FileSpreadsheet,
    formats: ['xlsx', 'pdf'],
    defaultFormat: 'xlsx',
  },
  {
    id: 'plano',
    title: 'Plano de Ação',
    description: 'Iniciativas estratégicas priorizadas com direcionamento tático.',
    icon: Presentation,
    formats: ['pptx', 'pdf'],
    defaultFormat: 'pptx',
  },
  {
    id: 'sintese',
    title: 'Síntese Executiva',
    description: 'Resumo consolidado: gaps + plano + recomendações para a diretoria.',
    icon: FileText,
    formats: ['pdf'],
    defaultFormat: 'pdf',
  },
];

const FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF',
  xlsx: 'Excel (.xlsx)',
  pptx: 'PowerPoint (.pptx)',
};

interface ExportPanelProps {
  validatedGapsCount: number;
  approvedInitiativesCount: number;
  hasInitiatives: boolean;
}

export function ExportPanel({
  validatedGapsCount,
  approvedInitiativesCount,
  hasInitiatives,
}: ExportPanelProps) {
  const [selectedFormats, setSelectedFormats] = useState<Record<string, ExportFormat>>({
    matriz: 'xlsx',
    plano: 'pptx',
    sintese: 'pdf',
  });

  const getAvailability = (
    deliverableId: string
  ): { available: boolean; reason?: string } => {
    switch (deliverableId) {
      case 'matriz':
        return validatedGapsCount > 0
          ? { available: true }
          : { available: false, reason: 'Requer gaps validados' };
      case 'plano':
        return hasInitiatives
          ? { available: true }
          : { available: false, reason: 'Requer iniciativas geradas' };
      case 'sintese':
        return validatedGapsCount > 0 && hasInitiatives
          ? { available: true }
          : {
              available: false,
              reason:
                validatedGapsCount === 0
                  ? 'Requer Matriz validada'
                  : 'Requer Plano gerado',
            };
      default:
        return { available: false, reason: 'Indisponível' };
    }
  };

  const handleExport = (deliverableId: string) => {
    const format = selectedFormats[deliverableId];
    const deliverable = DELIVERABLES.find((d) => d.id === deliverableId);
    toast({
      title: 'Exportação iniciada',
      description: `Gerando ${deliverable?.title} em ${FORMAT_LABELS[format]}...`,
    });
    // TODO: integrate with actual export edge function
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-xl border bg-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">
          Exportar Entregáveis
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DELIVERABLES.map((deliverable) => {
          const { available, reason } = getAvailability(deliverable.id);
          const Icon = deliverable.icon;
          const currentFormat = selectedFormats[deliverable.id];

          return (
            <motion.div
              key={deliverable.id}
              whileHover={available ? { y: -2 } : undefined}
              className={`rounded-lg border p-5 flex flex-col gap-3 transition-colors ${
                available
                  ? 'bg-card hover:border-primary/40'
                  : 'bg-muted/30 opacity-70'
              }`}
            >
              {/* Icon + title */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      available ? 'bg-primary/10' : 'bg-muted'
                    }`}
                  >
                    <Icon
                      className={`h-4.5 w-4.5 ${
                        available ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {deliverable.title}
                  </h3>
                </div>
                {available ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-success/10 text-success border-success/30"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Disponível
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-muted text-muted-foreground"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Pendente
                  </Badge>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                {deliverable.description}
              </p>

              {/* Unavailable reason */}
              {!available && reason && (
                <p className="text-xs text-warning">⚠️ {reason}</p>
              )}

              {/* Action */}
              <div className="mt-auto flex items-center gap-2">
                {deliverable.formats.length > 1 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8"
                        disabled={!available}
                      >
                        {FORMAT_LABELS[currentFormat]}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {deliverable.formats.map((fmt) => (
                        <DropdownMenuItem
                          key={fmt}
                          onClick={() =>
                            setSelectedFormats((prev) => ({
                              ...prev,
                              [deliverable.id]: fmt,
                            }))
                          }
                        >
                          {FORMAT_LABELS[fmt]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button
                  size="sm"
                  className="text-xs h-8 flex-1"
                  disabled={!available}
                  onClick={() => handleExport(deliverable.id)}
                >
                  <Download className="h-3 w-3 mr-1.5" />
                  {available ? 'Exportar' : 'Indisponível'}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
