import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { InitiativeTableRow } from './InitiativeTableRow';
import type { Initiative, InitiativeStatus } from '@/hooks/useInitiatives';
import type { Evidence } from '@/lib/types';

interface InitiativeTableProps {
  initiatives: Initiative[];
  evidences: Evidence[];
  onUpdateStatus: (id: string, status: InitiativeStatus) => void;
  onDelete: (id: string) => void;
  updatingId: string | null;
  deletingId: string | null;
}

export function InitiativeTable({
  initiatives,
  evidences,
  onUpdateStatus,
  onDelete,
  updatingId,
  deletingId,
}: InitiativeTableProps) {
  // Create a map of sequential_id to evidence for tooltip lookups
  const evidenceMap = new Map<string, Evidence>();
  evidences.forEach((ev) => {
    if (ev.sequential_id) {
      const gapId = `G${ev.sequential_id.toString().padStart(2, '0')}`;
      evidenceMap.set(gapId, ev);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">Iniciativa</TableHead>
              <TableHead className="w-[140px]">Gaps Atacados</TableHead>
              <TableHead>Direcionamento Estratégico</TableHead>
              <TableHead className="w-[180px]">Impacto Esperado</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initiatives.length === 0 ? (
              <TableRow>
                <td colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhuma iniciativa gerada ainda. Clique em "Gerar Plano com IA" para começar.
                </td>
              </TableRow>
            ) : (
              initiatives.map((initiative) => (
                <InitiativeTableRow
                  key={initiative.id}
                  initiative={initiative}
                  evidenceMap={evidenceMap}
                  onUpdateStatus={onUpdateStatus}
                  onDelete={onDelete}
                  isUpdating={updatingId === initiative.id}
                  isDeleting={deletingId === initiative.id}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
}
