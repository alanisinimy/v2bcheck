
# Plano: Elevacao do Plano Estrategico para Padrao de Auditoria

## Objetivo
Transformar a tela de Plano Estrategico (`Plan.tsx`) de uma visualizacao baseada em cards para uma tabela profissional no mesmo padrao da Matriz de Gaps, com rastreabilidade entre iniciativas e gaps.

---

## 1. Atualizacao do Schema do Banco de Dados

A tabela `initiatives` precisa de novas colunas para suportar a rastreabilidade:

**Novas colunas:**
- `related_gaps` (text[]) - Array com IDs dos gaps atacados (ex: ["G01", "G03"])
- `expected_impact` (text) - Descricao do impacto esperado (ex: "Conversao / Previsibilidade")
- `sequential_id` (integer) - ID sequencial para exibicao (IE01, IE02...)

```sql
ALTER TABLE initiatives 
ADD COLUMN related_gaps text[] DEFAULT '{}',
ADD COLUMN expected_impact text,
ADD COLUMN sequential_id integer;
```

---

## 2. Atualizacao da Edge Function `generate-strategic-plan`

### 2.1 Modificacoes no Prompt

**Adicionar leitura dos Gaps antes de gerar:**
- Buscar todas as evidencias validadas com `sequential_id`
- Passar para o prompt no formato: `G01: [descricao do gap]`

**Novo System Prompt:**
```
Analise os Gaps identificados (G01, G02...). 
Para cada conjunto de problemas relacionados, crie uma INICIATIVA ESTRATEGICA (IE).
OBRIGATORIO: Liste quais IDs de Gaps (ex: G01, G03) cada iniciativa resolve.
```

### 2.2 Novo Output Schema

```json
{
  "teamInsight": "string",
  "initiatives": [
    {
      "id": "IE01",
      "title": "Nome da Iniciativa",
      "related_gaps": ["G01", "G03"],
      "strategy": "Descricao tatica do que fazer",
      "expected_impact": "Conversao / Previsibilidade",
      "effort": "low|medium|high",
      "target_pilar": "processos"
    }
  ]
}
```

### 2.3 Atualizacao do Insert no Banco

Mapear novos campos ao inserir:
- `related_gaps` -> array de strings
- `expected_impact` -> texto com metricas afetadas
- `sequential_id` -> gerado sequencialmente (1, 2, 3...)

---

## 3. Novos Componentes Frontend

### 3.1 `InitiativeTable.tsx` (Novo)

Tabela seguindo o padrao de `EvidenceTable.tsx`:

**Colunas:**
| Coluna | Descricao | Largura |
|--------|-----------|---------|
| Iniciativa | ID + Titulo (ex: "IE01 — Reestruturacao") | 30% |
| Gaps Atacados | Badges cinzas (G01, G03) com Tooltip | 15% |
| Direcionamento | Texto descritivo (strategy/description) | 35% |
| Impacto Esperado | Texto com setas (↑ Conversao) | 15% |
| Acoes | Dropdown menu | 5% |

### 3.2 `InitiativeTableRow.tsx` (Novo)

Linha individual da tabela com:
- Formatacao do ID: `IE{sequential_id.toString().padStart(2, '0')}`
- Badges para gaps com Tooltip mostrando descricao do gap
- Dropdown com acoes: Aprovar, Iniciar, Concluir, Excluir

### 3.3 `GapTooltip.tsx` (Novo - Opcional)

Componente de Tooltip que:
- Recebe ID do gap (ex: "G01")
- Busca evidencia correspondente (via sequential_id)
- Exibe: pilar + descricao do gap

---

## 4. Atualizacoes de Arquivos Existentes

### 4.1 `Plan.tsx`

**Alteracoes:**
- Substituir `InitiativeCard` por `InitiativeTable`
- Adicionar busca de evidencias para contexto dos tooltips
- Passar evidencias para o componente de tabela

### 4.2 `useInitiatives.ts`

**Alteracoes:**
- Atualizar interface `Initiative` com novos campos:
  - `related_gaps: string[]`
  - `expected_impact: string | null`
  - `sequential_id: number | null`
- Atualizar query para ordenar por `sequential_id`

### 4.3 `src/lib/types.ts`

**Adicoes:**
- `InitiativeImpactDisplay` config para labels de impacto

---

## 5. Fluxo de Dados

```text
[Gerar Plano]
     |
     v
[Edge Function: generate-strategic-plan]
     |
     +-- 1. Busca evidencias validadas com sequential_id
     |
     +-- 2. Formata como: "G01: Baixa aderencia ao CRM..."
     |
     +-- 3. Envia para IA com prompt atualizado
     |
     +-- 4. Recebe resposta com related_gaps
     |
     +-- 5. Salva no banco com sequential_id
     |
     v
[Frontend: InitiativeTable]
     |
     +-- Exibe IE01, IE02...
     |
     +-- Badges G01, G03 com Tooltip
     |
     +-- Usuario ve rastreabilidade
```

---

## Secao Tecnica

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/plan/InitiativeTable.tsx` | Tabela principal de iniciativas |
| `src/components/plan/InitiativeTableRow.tsx` | Linha individual com tooltip |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Plan.tsx` | Trocar cards por tabela, buscar evidencias |
| `src/hooks/useInitiatives.ts` | Novos campos na interface |
| `supabase/functions/generate-strategic-plan/index.ts` | Novo prompt e schema |

### Migracao SQL

```sql
ALTER TABLE public.initiatives 
ADD COLUMN IF NOT EXISTS related_gaps text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expected_impact text,
ADD COLUMN IF NOT EXISTS sequential_id integer;

-- Trigger para sequential_id automatico
CREATE OR REPLACE FUNCTION set_initiative_sequential_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sequential_id := COALESCE(
    (SELECT MAX(sequential_id) + 1 FROM initiatives WHERE project_id = NEW.project_id),
    1
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_initiative_sequential_id
BEFORE INSERT ON initiatives
FOR EACH ROW
WHEN (NEW.sequential_id IS NULL)
EXECUTE FUNCTION set_initiative_sequential_id();
```

### Dependencias

- Nenhuma nova dependencia necessaria
- Reutiliza componentes Table, Badge, Tooltip do shadcn/ui
