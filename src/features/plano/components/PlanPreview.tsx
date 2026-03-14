import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Table2, Presentation, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { PILARES } from '@/lib/types';
import type { Initiative } from '@/hooks/useInitiatives';
import type { Evidence, Pilar } from '@/lib/types';

interface PlanPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initiatives: Initiative[];
  evidences: Evidence[];
  projectName: string;
  clientName: string;
  /** If set, auto-focuses on this initiative in the preview */
  focusInitiativeId?: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  approved: 'Aprovada',
  in_progress: 'Em Andamento',
  done: 'Concluída',
};

const IMPACT_LABELS: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

const EFFORT_LABELS: Record<string, string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

const CRITICALITY_COLORS: Record<string, string> = {
  alta: 'text-destructive',
  media: 'text-warning',
  baixa: 'text-success',
};

export function PlanPreview({
  open,
  onOpenChange,
  initiatives,
  evidences,
  projectName,
  clientName,
  focusInitiativeId,
}: PlanPreviewProps) {
  const [activeTab, setActiveTab] = useState<string>(
    focusInitiativeId ? 'deck' : 'sintese'
  );

  const validatedEvidences = evidences.filter((e) => e.status === 'validado');

  const evidenceMap = new Map<string, Evidence>();
  validatedEvidences.forEach((ev) => {
    if (ev.sequential_id) {
      evidenceMap.set(`G${ev.sequential_id.toString().padStart(2, '0')}`, ev);
    }
  });

  // Group evidences by pilar for matriz view
  const byPilar = validatedEvidences.reduce(
    (acc, ev) => {
      if (!acc[ev.pilar]) acc[ev.pilar] = [];
      acc[ev.pilar].push(ev);
      return acc;
    },
    {} as Record<Pilar, Evidence[]>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Preview dos Entregáveis
            </h2>
            <p className="text-sm text-muted-foreground">
              {clientName} — {projectName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="mx-6 mt-4 w-fit">
            <TabsTrigger value="sintese" className="gap-2">
              <FileText className="h-4 w-4" />
              Síntese Executiva
            </TabsTrigger>
            <TabsTrigger value="matriz" className="gap-2">
              <Table2 className="h-4 w-4" />
              Matriz de Gaps
            </TabsTrigger>
            <TabsTrigger value="deck" className="gap-2">
              <Presentation className="h-4 w-4" />
              Deck do Plano
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto p-6">
            <TabsContent value="sintese" className="mt-0 h-full">
              <SintesePreview
                initiatives={initiatives}
                evidences={validatedEvidences}
                projectName={projectName}
                clientName={clientName}
              />
            </TabsContent>

            <TabsContent value="matriz" className="mt-0 h-full">
              <MatrizPreview byPilar={byPilar} />
            </TabsContent>

            <TabsContent value="deck" className="mt-0 h-full">
              <DeckPreview
                initiatives={initiatives}
                evidenceMap={evidenceMap}
                focusId={focusInitiativeId}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Síntese Executiva ─── */
function SintesePreview({
  initiatives,
  evidences,
  projectName,
  clientName,
}: {
  initiatives: Initiative[];
  evidences: Evidence[];
  projectName: string;
  clientName: string;
}) {
  const approvedCount = initiatives.filter(
    (i) => i.status !== 'draft'
  ).length;
  const highImpact = initiatives.filter((i) => i.impact === 'high').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      {/* Document simulation */}
      <div className="bg-card border rounded-lg shadow-sm p-8 space-y-6">
        {/* Title block */}
        <div className="text-center space-y-2 pb-6 border-b">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Síntese Executiva
          </p>
          <h3 className="text-xl font-bold text-foreground">{projectName}</h3>
          <p className="text-sm text-muted-foreground">{clientName}</p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-foreground">
              {evidences.length}
            </p>
            <p className="text-xs text-muted-foreground">Gaps Identificados</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-foreground">
              {initiatives.length}
            </p>
            <p className="text-xs text-muted-foreground">
              Iniciativas Propostas
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-foreground">{highImpact}</p>
            <p className="text-xs text-muted-foreground">Alto Impacto</p>
          </div>
        </div>

        <Separator />

        {/* Pillar coverage summary */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Cobertura por Pilar
          </h4>
          <div className="space-y-2">
            {(Object.keys(PILARES) as Pilar[]).map((pilar) => {
              const count = evidences.filter((e) => e.pilar === pilar).length;
              const pct =
                evidences.length > 0
                  ? Math.round((count / evidences.length) * 100)
                  : 0;
              return (
                <div key={pilar} className="flex items-center gap-3">
                  <span className="text-sm w-6">{PILARES[pilar].icon}</span>
                  <span className="text-sm w-28 text-foreground">
                    {PILARES[pilar].label}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Top initiatives */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Iniciativas Prioritárias
          </h4>
          <div className="space-y-3">
            {initiatives
              .filter((i) => i.impact === 'high')
              .slice(0, 5)
              .map((init, idx) => (
                <div
                  key={init.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="font-mono text-xs text-muted-foreground mt-0.5">
                    {idx + 1}.
                  </span>
                  <div>
                    <p className="font-medium text-foreground">{init.title}</p>
                    {init.expected_impact && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ↑ {init.expected_impact}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            {initiatives.filter((i) => i.impact === 'high').length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Nenhuma iniciativa de alto impacto definida.
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Matriz de Gaps (tabular) ─── */
function MatrizPreview({
  byPilar,
}: {
  byPilar: Record<string, Evidence[]>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-1"
    >
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-foreground w-16">
                ID
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground w-28">
                Pilar
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground">
                Gap Identificado
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground w-24">
                Criticidade
              </th>
              <th className="text-left px-4 py-3 font-semibold text-foreground w-32">
                Benchmark
              </th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(PILARES) as Pilar[]).map((pilar) =>
              (byPilar[pilar] || []).map((ev) => (
                <tr
                  key={ev.id}
                  className="border-t border-border/50 hover:bg-muted/30"
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                    G{(ev.sequential_id ?? 0).toString().padStart(2, '0')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs">
                      {PILARES[pilar].icon} {PILARES[pilar].label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-foreground">
                    {ev.content}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-xs font-medium ${CRITICALITY_COLORS[ev.criticality || 'media']}`}
                    >
                      {ev.criticality === 'alta'
                        ? 'Alta'
                        : ev.criticality === 'baixa'
                          ? 'Baixa'
                          : 'Média'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">
                    {ev.benchmark || '—'}
                  </td>
                </tr>
              ))
            )}
            {Object.values(byPilar).flat().length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Nenhum gap validado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

/* ─── Deck do Plano de Ação (slides) ─── */
function DeckPreview({
  initiatives,
  evidenceMap,
  focusId,
}: {
  initiatives: Initiative[];
  evidenceMap: Map<string, Evidence>;
  focusId?: string;
}) {
  const [activeSlide, setActiveSlide] = useState(() => {
    if (focusId) {
      const idx = initiatives.findIndex((i) => i.id === focusId);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  if (initiatives.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma iniciativa para exibir no deck.
      </div>
    );
  }

  const current = initiatives[activeSlide];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="bg-card border rounded-lg shadow-sm aspect-[16/9] max-h-[420px] p-8 flex flex-col justify-between"
        >
          {/* Top */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                IE{(current.sequential_id ?? activeSlide + 1)
                  .toString()
                  .padStart(2, '0')}
              </span>
              {current.target_pilar && (
                <Badge variant="outline" className="text-xs">
                  {PILARES[current.target_pilar]?.icon}{' '}
                  {PILARES[current.target_pilar]?.label}
                </Badge>
              )}
              <Badge
                variant="outline"
                className="text-xs ml-auto"
              >
                {STATUS_LABELS[current.status] || current.status}
              </Badge>
            </div>

            <h3 className="text-xl font-bold text-foreground">
              {current.title}
            </h3>

            {current.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>
            )}
          </div>

          {/* Bottom: metadata */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Impacto</p>
              <p className="text-sm font-medium text-foreground">
                {IMPACT_LABELS[current.impact] || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Esforço</p>
              <p className="text-sm font-medium text-foreground">
                {EFFORT_LABELS[current.effort] || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Gaps Atacados
              </p>
              <div className="flex flex-wrap gap-1">
                {(current.related_gaps || []).map((gapId) => (
                  <Badge
                    key={gapId}
                    variant="secondary"
                    className="text-[10px]"
                  >
                    {gapId}
                  </Badge>
                ))}
                {(current.related_gaps || []).length === 0 && (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Slide navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {initiatives.map((init, idx) => (
            <button
              key={init.id}
              onClick={() => setActiveSlide(idx)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                idx === activeSlide
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              IE{(init.sequential_id ?? idx + 1)
                .toString()
                .padStart(2, '0')}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={activeSlide === 0}
            onClick={() => setActiveSlide((s) => s - 1)}
          >
            ← Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={activeSlide === initiatives.length - 1}
            onClick={() => setActiveSlide((s) => s + 1)}
          >
            Próximo →
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
