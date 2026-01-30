import { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2, Check, X, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { PILARES, IMPACT_CONFIG, CRITICALITY_CONFIG } from '@/lib/types';
import type { Evidence, EvidenceStatus } from '@/lib/types';

interface EvidenceTableRowProps {
  evidence: Evidence;
  onEdit: (evidence: Evidence) => void;
  onDelete: (evidenceId: string) => void;
  onStatusChange: (evidenceId: string, status: EvidenceStatus) => void;
}

export function EvidenceTableRow({
  evidence,
  onEdit,
  onDelete,
  onStatusChange,
}: EvidenceTableRowProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const formatId = (id: number | undefined) => {
    if (!id) return 'G--';
    return `G${id.toString().padStart(2, '0')}`;
  };

  const pilarConfig = PILARES[evidence.pilar];
  const criticalityConfig = evidence.criticality 
    ? CRITICALITY_CONFIG[evidence.criticality] 
    : CRITICALITY_CONFIG.media;
  const impactConfig = evidence.impact ? IMPACT_CONFIG[evidence.impact] : null;

  const handleStatusToggle = (targetStatus: EvidenceStatus) => {
    if (evidence.status === targetStatus) {
      onStatusChange(evidence.id, 'pendente');
    } else {
      onStatusChange(evidence.id, targetStatus);
    }
  };

  return (
    <>
      <TableRow className="group">
        {/* ID */}
        <TableCell className="font-mono text-xs text-muted-foreground w-[60px]">
          {formatId(evidence.sequential_id)}
        </TableCell>

        {/* Pilar */}
        <TableCell className="w-[120px]">
          <Badge variant="outline" className="text-xs font-medium">
            {pilarConfig.label}
          </Badge>
        </TableCell>

        {/* Gap Identificado */}
        <TableCell className="max-w-[300px]">
          <p className="text-sm line-clamp-2">{evidence.content}</p>
        </TableCell>

        {/* Benchmark */}
        <TableCell className="max-w-[200px]">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {evidence.benchmark || '—'}
          </p>
        </TableCell>

        {/* Impacto */}
        <TableCell className="w-[100px]">
          {impactConfig ? (
            <span className="text-xs text-muted-foreground">{impactConfig.label}</span>
          ) : (
            <span className="text-xs text-muted-foreground/50">—</span>
          )}
        </TableCell>

        {/* Criticidade */}
        <TableCell className="w-[100px]">
          <Badge 
            variant="outline" 
            className={cn('text-xs', criticalityConfig.color)}
          >
            {criticalityConfig.label}
          </Badge>
        </TableCell>

        {/* Ações */}
        <TableCell className="w-[60px]">
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
              <DropdownMenuItem onClick={() => onEdit(evidence)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleStatusToggle('validado')}
                className={evidence.status === 'validado' ? 'bg-success/10' : ''}
              >
                <Check className="mr-2 h-4 w-4 text-success" />
                {evidence.status === 'validado' ? 'Remover Validação' : 'Validar'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusToggle('rejeitado')}
                className={evidence.status === 'rejeitado' ? 'bg-destructive/10' : ''}
              >
                <X className="mr-2 h-4 w-4 text-destructive" />
                {evidence.status === 'rejeitado' ? 'Remover Rejeição' : 'Rejeitar'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleStatusToggle('investigar')}
                className={evidence.status === 'investigar' ? 'bg-warning/10' : ''}
              >
                <Search className="mr-2 h-4 w-4 text-warning" />
                {evidence.status === 'investigar' ? 'Remover Investigação' : 'Investigar'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evidência?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A evidência será permanentemente removida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(evidence.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
