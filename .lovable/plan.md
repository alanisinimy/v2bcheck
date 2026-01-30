
# Plano: Matriz de Diagnóstico - Transformação para Visualização de Auditoria Profissional

## Objetivo
Transformar a tela de Matriz de Diagnóstico de um layout informal de cards (estilo Trello) para uma tabela densa e profissional (estilo McKinsey/Deloitte), com novas colunas de dados e UX aprimorada.

---

## Resumo das Mudanças

| Componente | Ação |
|------------|------|
| `src/pages/Matriz.tsx` | Substituir grid de cards por componente de tabela |
| `src/components/matriz/EvidenceCard.tsx` | Remover (não será mais usado) |
| `src/components/matriz/FilterBar.tsx` | Simplificar para filtros de tabela (Pilar + Criticidade) |
| `src/components/matriz/EvidenceTable.tsx` | **Novo** - Componente de tabela profissional |
| `src/components/matriz/EvidenceTableRow.tsx` | **Novo** - Linha da tabela com ações |
| `src/components/matriz/EditEvidenceDialog.tsx` | **Novo** - Modal de edição |
| `src/lib/types.ts` | Adicionar novos tipos (Impacto, Criticidade) |
| `supabase/migrations/` | Adicionar colunas no banco de dados |

---

## Detalhamento Técnico

### 1. Migração do Banco de Dados

Adicionar três novas colunas à tabela `evidences`:

```sql
-- Adicionar novos campos para visão de auditoria
ALTER TABLE public.evidences 
ADD COLUMN benchmark text,
ADD COLUMN impact text CHECK (impact IN ('receita', 'eficiencia', 'risco')),
ADD COLUMN criticality text DEFAULT 'media' CHECK (criticality IN ('alta', 'media', 'baixa')),
ADD COLUMN sequential_id integer;

-- Criar função para gerar ID sequencial por projeto
CREATE OR REPLACE FUNCTION generate_evidence_sequential_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(sequential_id), 0) + 1
  INTO NEW.sequential_id
  FROM public.evidences
  WHERE project_id = NEW.project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para auto-incrementar ID sequencial
CREATE TRIGGER set_evidence_sequential_id
BEFORE INSERT ON public.evidences
FOR EACH ROW
EXECUTE FUNCTION generate_evidence_sequential_id();

-- Atualizar registros existentes com IDs sequenciais
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as seq
  FROM public.evidences
)
UPDATE public.evidences e
SET sequential_id = n.seq
FROM numbered n
WHERE e.id = n.id;
```

### 2. Atualizar Types (`src/lib/types.ts`)

```typescript
export type ImpactType = 'receita' | 'eficiencia' | 'risco';
export type CriticalityType = 'alta' | 'media' | 'baixa';

export const IMPACT_CONFIG: Record<ImpactType, { label: string; icon: string }> = {
  receita: { label: 'Receita', icon: 'TrendingUp' },
  eficiencia: { label: 'Eficiencia', icon: 'Zap' },
  risco: { label: 'Risco', icon: 'AlertTriangle' },
};

export const CRITICALITY_CONFIG: Record<CriticalityType, { label: string; color: string }> = {
  alta: { label: 'Alta', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  media: { label: 'Media', color: 'bg-warning/15 text-warning border-warning/30' },
  baixa: { label: 'Baixa', color: 'bg-success/15 text-success border-success/30' },
};

// Atualizar interface Evidence
export interface Evidence {
  // ... campos existentes
  benchmark?: string;
  impact?: ImpactType;
  criticality?: CriticalityType;
  sequential_id?: number;
}
```

### 3. Novo Componente: `EvidenceTable.tsx`

Estrutura da tabela usando shadcn/ui Table:

```text
+-----+----------+--------------------------------+-----------------------+-----------+------------+---------+
| ID  | Pilar    | Gap Identificado               | Benchmark (O Ideal)   | Impacto   | Criticidade| Acoes   |
+-----+----------+--------------------------------+-----------------------+-----------+------------+---------+
| G01 | [Badge]  | Texto longo da evidencia...    | Funil estruturado...  | Receita   | [Alta]     | [...] |
| G02 | [Badge]  | Outro gap identificado...      | Processo definido...  | Eficiencia| [Media]    | [...] |
+-----+----------+--------------------------------+-----------------------+-----------+------------+---------+
```

**Caracteristicas:**
- ID formatado como "G01", "G02", etc.
- Badge colorida compacta para Pilar (sem icone de emoji)
- Coluna "Gap Identificado" com largura maior (~40% da tabela)
- Coluna "Benchmark" editavel
- Badge colorida para Criticidade (vermelha/amarela/verde)
- Menu dropdown para acoes (Editar, Validar, Rejeitar, Excluir)

### 4. Filtros Simplificados no Topo

Substituir FilterBar atual por filtros inline mais discretos:

```text
[Pilar: Todos v] [Criticidade: Todas v] [Buscar...]     Mostrando 15 de 42 gaps
```

**Filtros disponiveis:**
- Pilar (dropdown)
- Criticidade (dropdown)
- Campo de busca por texto

### 5. Paginacao

Implementar paginacao com 20 itens por pagina usando componente Pagination do shadcn/ui:

```text
Mostrando 1-20 de 42 gaps    [< Anterior] [1] [2] [3] [Proximo >]
```

### 6. Dialog de Edicao (`EditEvidenceDialog.tsx`)

Modal para editar todos os campos de uma evidencia:

- Gap Identificado (textarea)
- Benchmark (textarea)
- Pilar (select)
- Impacto (select)
- Criticidade (select)
- Status (botoes radio)

### 7. Hooks Adicionais

**useUpdateEvidence** - Mutation para atualizar campos da evidencia
**useDeleteEvidence** - Mutation para excluir evidencia

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/xxx_add_audit_columns.sql` | Criar |
| `src/lib/types.ts` | Modificar |
| `src/components/matriz/EvidenceTable.tsx` | Criar |
| `src/components/matriz/EvidenceTableRow.tsx` | Criar |
| `src/components/matriz/TableFilters.tsx` | Criar |
| `src/components/matriz/EditEvidenceDialog.tsx` | Criar |
| `src/hooks/useProject.ts` | Modificar (add mutations) |
| `src/pages/Matriz.tsx` | Modificar |
| `src/components/matriz/EvidenceCard.tsx` | Manter (nao deletar, apenas nao usar) |

---

## Resultado Visual Esperado

A nova interface tera aparencia de relatorio de consultoria:

- Fundo branco limpo
- Tabela com bordas sutis
- Tipografia densa e profissional (texto menor)
- Badges compactas com cores significativas
- Acoes discretas em menu dropdown
- Paginacao clara no rodape

---

## Ordem de Execucao

1. Executar migracao do banco de dados (adicionar colunas)
2. Atualizar tipos TypeScript
3. Criar componente de tabela
4. Criar componente de linha
5. Criar filtros inline
6. Criar dialog de edicao
7. Adicionar hooks de mutacao
8. Atualizar pagina Matriz.tsx
9. Testar fluxo completo
