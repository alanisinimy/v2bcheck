
# Conexao do Dashboard com Dados Reais do Supabase

Substituir os dados mockados do Dashboard por metricas calculadas a partir das evidencias reais do banco de dados.

---

## Visao Geral

| Situacao Atual | Situacao Futura |
|----------------|-----------------|
| `mockStats` com valores fixos | Dados calculados via `useProjectStats` |
| Divergencias hardcoded | Lista dinamica das ultimas divergencias |
| Graficos estaticos | Contagens reais por pilar e status |

---

## 1. Estrutura Existente (Ja Implementada)

O hook `useProjectStats` ja existe em `src/hooks/useProject.ts`:

```text
useProjectStats(projectId)
├── Usa useEvidences internamente
├── Calcula: total, byPilar, byStatus, divergences
└── Retorna objeto com metricas agregadas
```

**O que falta**: Usar esse hook no Dashboard ao inves dos mocks.

---

## 2. Alteracoes no Dashboard.tsx

### 2.1 Remover Mock Stats

```text
Antes:
  const mockStats = { total: 24, ... };  // Dados fakes

Depois:
  const stats = useProjectStats(currentProject?.id);  // Dados reais
```

### 2.2 Atualizar Referencias

| Antes | Depois |
|-------|--------|
| `mockStats.total` | `stats.total` |
| `mockStats.byStatus?.validado` | `stats.byStatus?.validado || 0` |
| `mockStats.byStatus?.pendente` | `stats.byStatus?.pendente || 0` |
| `mockStats.divergences` | `stats.divergences` |
| `mockStats.byPilar?.[pilar]` | `stats.byPilar?.[pilar] || 0` |

### 2.3 Adicionar Lista de Divergencias Reais

Substituir as divergencias hardcoded por uma lista dinamica:

```text
// Filtrar evidencias marcadas como divergencia
const divergences = evidences?.filter(ev => 
  ev.is_divergence || ev.evidence_type === 'divergencia'
) || [];

// Exibir as 5 mais recentes
divergences.slice(0, 5).map(...)
```

### 2.4 Estado Vazio

Quando nao houver evidencias:

```text
┌─────────────────────────────────────┐
│ Total: 0 │ Validadas: 0 │ ... │    │
├─────────────────────────────────────┤
│ Graficos com barras zeradas         │
├─────────────────────────────────────┤
│ "Nenhuma evidencia processada       │
│  ainda. Envie arquivos pelo Vault." │
└─────────────────────────────────────┘
```

---

## 3. Fluxo de Atualizacao

```text
┌──────────────┐     ┌─────────────┐     ┌───────────┐
│   Matriz     │ --> │  Valida     │ --> │ Dashboard │
│  (usuario)   │     │  Evidencia  │     │ atualiza  │
└──────────────┘     └─────────────┘     └───────────┘
       │                    │                   │
       │         invalidateQueries        refetch
       │                    │                   │
       └────────────────────┴───────────────────┘
```

O cache do React Query ja faz o refetch automatico quando:
- `useUpdateEvidenceStatus` invalida a query `['evidences', projectId]`
- Usuario navega de volta ao Dashboard

---

## 4. Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/Dashboard.tsx` | Substituir mocks por dados reais |

**Nota**: Nenhuma migracao de banco necessaria. Apenas atualizacao de UI.

---

## 5. Codigo: Mudancas Principais

### Dashboard.tsx - Imports e Hooks

```text
// Adicionar import
import { useProjectStats, useEvidences } from '@/hooks/useProject';

// Substituir mock por hook real
const stats = useProjectStats(currentProject?.id);
const { data: evidences, isLoading: isLoadingEvidences } = useEvidences(currentProject?.id);
```

### Dashboard.tsx - Lista de Divergencias

```text
// Filtrar divergencias reais
const recentDivergences = evidences
  ?.filter(ev => ev.is_divergence || ev.evidence_type === 'divergencia')
  .slice(0, 5) || [];

// Se vazio, mostrar mensagem
{recentDivergences.length === 0 ? (
  <p>Nenhuma divergencia detectada ainda.</p>
) : (
  recentDivergences.map(div => <DivergenceItem ... />)
)}
```

---

## Resultado Esperado

1. **KPIs Dinamicos**: Cards mostram contagens reais de evidencias
2. **Pilares Atualizados**: Progresso reflete distribuicao real por pilar
3. **Divergencias Reais**: Lista mostra evidencias marcadas como divergencia
4. **Reatividade**: Ao validar na Matriz, voltar ao Dashboard mostra +1 em "Validadas"
5. **Estado Vazio**: Mensagem amigavel quando projeto nao tem evidencias
