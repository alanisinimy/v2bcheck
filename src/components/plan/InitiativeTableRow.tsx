import { useState } from 'react';
import { MoreHorizontal, Check, Play, Trash2, Loader2, Eye } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { PILARES } from '@/lib/types';
import type { Initiative, InitiativeStatus } from '@/hooks/useInitiatives';
import type { Evidence } from '@/lib/types';

interface InitiativeTableRowProps {
  initiative: Initiative;
  evidenceMap: Map<string, Evidence>;
  onUpdateStatus: (id: string, status: InitiativeStatus) => void;
  onDelete: (id: string) => void;
  onPreview?: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

const STATUS_COLORS: Record<InitiativeStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  approved: 'bg-success/15 text-success border-success/30',
  in_progress: 'bg-primary/15 text-primary border-primary/30',
  done: 'bg-success/15 text-success border-success/30',
};

export function InitiativeTableRow({
  initiative,
  evidenceMap,
  onUpdateStatus,
  onDelete,
  onPreview,
  isUpdating = false,
  isDeleting = false,
}: InitiativeTableRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatId = (id: number | undefined | null) => {
    if (!id) return 'IE--';
    return `IE${id.toString().padStart(2, '0')}`;
  };

  const getStatusLabel = (status: InitiativeStatus) => {
    const labels: Record<InitiativeStatus, string> = {
      draft: 'Rascunho',
      approved: 'Aprovada',
      in_progress: 'Em Andamento',
      done: 'Concluída',
    };
    return labels[status];
  };

  const getNextAction = (): { status: InitiativeStatus; label: string; icon: typeof Check } | null => {
    switch (initiative.status) {
      case 'draft':
        return { status: 'approved', label: 'Aprovar', icon: Check };
      case 'approved':
        return { status: 'in_progress', label: 'Iniciar Execução', icon: Play };
      case 'in_progress':
        return { status: 'done', label: 'Marcar como Concluída', icon: Check };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <>
      <TableRow className="group">
        {/* Iniciativa: ID + Título */}
        <TableCell className="w-[280px]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {formatId(initiative.sequential_id)}
              </span>
              <Badge 
                variant="outline" 
                className={cn('text-[10px] px-1.5 py-0', STATUS_COLORS[initiative.status])}
              >
                {getStatusLabel(initiative.status)}
              </Badge>
            </div>
            <span className="font-medium text-sm">{initiative.title}</span>
          </div>
        </TableCell>

        {/* Gaps Atacados */}
        <TableCell className="w-[140px]">
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap gap-1">
              {(initiative.related_gaps || []).length > 0 ? (
                (initiative.related_gaps || []).map((gapId) => {
                  const evidence = evidenceMap.get(gapId);
                  return (
                    <Tooltip key={gapId}>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="secondary"
                          className="text-xs cursor-help bg-muted hover:bg-muted/80"
                        >
                          {gapId}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        {evidence ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span>{PILARES[evidence.pilar]?.icon}</span>
                              <span>{PILARES[evidence.pilar]?.label}</span>
                            </div>
                            <p className="text-sm">{evidence.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Gap não encontrado</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                })
              ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
              )}
            </div>
          </TooltipProvider>
        </TableCell>

        {/* Direcionamento Estratégico */}
        <TableCell>
          <p className="text-sm line-clamp-2">
            {initiative.description || initiative.reasoning || '—'}
          </p>
        </TableCell>

        {/* Impacto Esperado */}
        <TableCell className="w-[180px]">
          <p className="text-sm text-muted-foreground">
            {initiative.expected_impact || '—'}
          </p>
        </TableCell>

        {/* Ações */}
        <TableCell className="w-[60px]">
          {isUpdating || isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {nextAction && (
                  <>
                    <DropdownMenuItem onClick={() => onUpdateStatus(initiative.id, nextAction.status)}>
                      <nextAction.icon className="mr-2 h-4 w-4 text-success" />
                      {nextAction.label}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {initiative.status === 'draft' && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Descartar
                  </DropdownMenuItem>
                )}
                {initiative.status !== 'draft' && initiative.status !== 'done' && (
                  <DropdownMenuItem
                    onClick={() => onUpdateStatus(initiative.id, 'draft')}
                    className="text-muted-foreground"
                  >
                    Voltar para Rascunho
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </TableCell>
      </TableRow>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar iniciativa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A iniciativa será permanentemente removida do plano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(initiative.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
