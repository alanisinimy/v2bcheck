

# Plano: Adicionar Coluna de Status na Matriz de Gaps

## Objetivo
Exibir o status de cada evidência/gap diretamente na tabela da Matriz, permitindo visualização rápida do estado de validação sem precisar abrir o menu de ações.

---

## 1. Alterações no Componente da Tabela

### `src/components/matriz/EvidenceTable.tsx`

Adicionar nova coluna "Status" no cabeçalho:

**Antes:**
```
ID | Pilar | Gap Identificado | Benchmark | Impacto | Criticidade | Ações
```

**Depois:**
```
ID | Pilar | Gap Identificado | Benchmark | Impacto | Criticidade | Status | Ações
```

**Mudança específica:**
- Adicionar `<TableHead className="w-[100px]">Status</TableHead>` após Criticidade
- Atualizar `colSpan` no estado vazio de 7 para 8

---

## 2. Alterações na Linha da Tabela

### `src/components/matriz/EvidenceTableRow.tsx`

Adicionar nova célula exibindo o status com badge colorido:

**Visual:**
| Status | Cor do Badge |
|--------|--------------|
| Pendente | Cinza (bg-muted) |
| Validado | Verde (bg-success/15) |
| Rejeitado | Vermelho (bg-destructive/15) |
| Investigar | Amarelo (bg-warning/15) |

**Código da nova célula:**
```typescript
<TableCell className="w-[100px]">
  <Badge 
    variant="outline" 
    className={cn('text-xs', STATUS_CONFIG[evidence.status].color)}
  >
    {STATUS_CONFIG[evidence.status].label}
  </Badge>
</TableCell>
```

---

## 3. (Opcional) Filtro por Status

### `src/components/matriz/TableFilters.tsx`

Adicionar filtro de status aos filtros existentes:

**Novo dropdown:**
- "Todos os Status"
- "Pendente"
- "Validado"
- "Rejeitado"
- "Investigar"

**Props adicionais:**
```typescript
selectedStatus: EvidenceStatus | 'all';
onStatusChange: (status: EvidenceStatus | 'all') => void;
```

---

## Seção Técnica

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/matriz/EvidenceTable.tsx` | Adicionar coluna Status no header, atualizar colSpan |
| `src/components/matriz/EvidenceTableRow.tsx` | Adicionar célula com badge de status |
| `src/components/matriz/TableFilters.tsx` | Adicionar filtro por status (opcional) |

### Estrutura Final da Tabela

```
+------+----------+------------------+-----------+---------+------------+----------+-------+
|  ID  |  Pilar   | Gap Identificado | Benchmark | Impacto | Criticidade|  Status  | Ações |
+------+----------+------------------+-----------+---------+------------+----------+-------+
| G01  | Processos| Baixa aderência..| CRM com...| Receita |    Alta    | Pendente |  ...  |
| G02  | Pessoas  | Falta de treina..| Onboarding| Eficiên.|   Média    | Validado |  ...  |
+------+----------+------------------+-----------+---------+------------+----------+-------+
```

### Importação Necessária

Em `EvidenceTableRow.tsx`, importar `STATUS_CONFIG` de `@/lib/types`:
```typescript
import { PILARES, IMPACT_CONFIG, CRITICALITY_CONFIG, STATUS_CONFIG } from '@/lib/types';
```

### Dependências
- Nenhuma nova dependência
- Reutiliza o `STATUS_CONFIG` já existente em `src/lib/types.ts`

