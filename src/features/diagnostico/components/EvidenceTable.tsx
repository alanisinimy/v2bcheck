import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { TableFilters } from './TableFilters';
import { EvidenceTableRow } from './EvidenceTableRow';
import { EditEvidenceDialog } from './EditEvidenceDialog';
import { useUpdateEvidence, useDeleteEvidence } from '@/hooks/useProject';
import { toast } from '@/hooks/use-toast';
import type { Evidence, Pilar, CriticalityType, EvidenceStatus, ImpactType } from '@/lib/types';

interface EvidenceTableProps {
  evidences: Evidence[];
  projectId: string;
  onStatusChange: (evidenceId: string, status: EvidenceStatus) => void;
}

const ITEMS_PER_PAGE = 20;

export function EvidenceTable({ evidences, projectId, onStatusChange }: EvidenceTableProps) {
  const [selectedPilar, setSelectedPilar] = useState<Pilar | 'all'>('all');
  const [selectedCriticality, setSelectedCriticality] = useState<CriticalityType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<EvidenceStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingEvidence, setEditingEvidence] = useState<Evidence | null>(null);

  const updateMutation = useUpdateEvidence();
  const deleteMutation = useDeleteEvidence();

  // Filter evidences
  const filteredEvidences = useMemo(() => {
    return evidences.filter((ev) => {
      if (selectedPilar !== 'all' && ev.pilar !== selectedPilar) return false;
      if (selectedCriticality !== 'all' && (ev.criticality || 'media') !== selectedCriticality) return false;
      if (selectedStatus !== 'all' && ev.status !== selectedStatus) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesContent = ev.content.toLowerCase().includes(search);
        const matchesBenchmark = ev.benchmark?.toLowerCase().includes(search);
        if (!matchesContent && !matchesBenchmark) return false;
      }
      return true;
    });
  }, [evidences, selectedPilar, selectedCriticality, selectedStatus, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredEvidences.length / ITEMS_PER_PAGE);
  const paginatedEvidences = filteredEvidences.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleEdit = (evidence: Evidence) => {
    setEditingEvidence(evidence);
  };

  const handleSaveEdit = async (
    evidenceId: string,
    updates: {
      content?: string;
      benchmark?: string;
      pilar?: Pilar;
      impact?: ImpactType;
      criticality?: CriticalityType;
      status?: EvidenceStatus;
    }
  ) => {
    try {
      await updateMutation.mutateAsync({ evidenceId, updates });
      setEditingEvidence(null);
      toast({
        title: 'Evidência atualizada',
        description: 'As alterações foram salvas com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (evidenceId: string) => {
    try {
      await deleteMutation.mutateAsync({ evidenceId, projectId });
      toast({
        title: 'Evidência excluída',
        description: 'A evidência foi removida permanentemente.',
      });
    } catch (error) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a evidência.',
        variant: 'destructive',
      });
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => setCurrentPage(i)}
            isActive={currentPage === i}
            className="cursor-pointer"
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <TableFilters
        selectedPilar={selectedPilar}
        selectedCriticality={selectedCriticality}
        selectedStatus={selectedStatus}
        searchTerm={searchTerm}
        onPilarChange={handleFilterChange(setSelectedPilar)}
        onCriticalityChange={handleFilterChange(setSelectedCriticality)}
        onStatusChange={handleFilterChange(setSelectedStatus)}
        onSearchChange={handleFilterChange(setSearchTerm)}
        totalCount={evidences.length}
        filteredCount={filteredEvidences.length}
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead className="w-[120px]">Pilar</TableHead>
              <TableHead>Gap Identificado</TableHead>
              <TableHead className="w-[200px]">Benchmark</TableHead>
              <TableHead className="w-[100px]">Impacto</TableHead>
              <TableHead className="w-[100px]">Criticidade</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEvidences.length === 0 ? (
              <TableRow>
                <td colSpan={8} className="h-24 text-center text-muted-foreground">
                  {evidences.length === 0
                    ? 'Nenhuma evidência ainda. Clique em "Nova Evidência" para criar uma.'
                    : 'Nenhuma evidência encontrada com os filtros atuais.'}
                </td>
              </TableRow>
            ) : (
              paginatedEvidences.map((evidence) => (
                <EvidenceTableRow
                  key={evidence.id}
                  evidence={evidence}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={onStatusChange}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {renderPaginationItems()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Edit Dialog */}
      <EditEvidenceDialog
        evidence={editingEvidence}
        open={!!editingEvidence}
        onOpenChange={(open) => !open && setEditingEvidence(null)}
        onSave={handleSaveEdit}
        isLoading={updateMutation.isPending}
      />
    </motion.div>
  );
}
