
# Plano: Transformar Extração de Citações em Análise de Gaps Estratégicos

## Problema Atual
A IA extrai micro-fatos e frases soltas, resultando em 50+ evidências fragmentadas por reunião. Isso gera ruído e trabalho manual excessivo para o consultor.

## Solução Proposta
Mudar a abordagem de "auditor que anota citações" para "consultor estratégico que identifica gaps de mercado", produzindo 5-8 gaps consolidados e acionáveis por arquivo.

---

## Resumo das Mudanças

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/analyze-evidences/index.ts` | Reescrever | Nova persona + schema de output + regras de condensação |
| `src/hooks/useAnalyzeEvidences.ts` | Modificar | Adaptar interface para receber novos campos |
| `src/lib/types.ts` | Adicionar | Novo tipo `ImpactType` com valor `cultura` |

---

## Detalhamento Técnico

### 1. Nova Persona no System Prompt

Trocar a persona de "Auditor Sênior" para "Consultor Estratégico McKinsey":

```text
Você é um Consultor Estratégico Sênior estilo McKinsey/Deloitte.

Sua missão: Identificar GAPS DE MERCADO que impedem a empresa 
de atingir seu potencial de vendas.

Você NÃO extrai citações. Você SINTETIZA problemas estratégicos.
```

### 2. Novo JSON Schema de Output

O output da IA passará a retornar objetos completos:

```json
{
  "gaps": [
    {
      "gap": "Baixa adoção de CRM com dados não confiáveis",
      "pilar": "tecnologia",
      "benchmark": "Gestão centralizada de pipeline com dados limpos e atualizados diariamente",
      "impacto": "receita",
      "criticidade": "alta",
      "is_divergence": false
    }
  ]
}
```

**Campos:**
- `gap`: Descrição sintética do problema (sem aspas, narrativa)
- `pilar`: Um dos 5 pilares
- `benchmark`: Qual é a melhor prática de mercado que está faltando
- `impacto`: `receita` | `eficiencia` | `risco` | `cultura`
- `criticidade`: `alta` | `media` | `baixa`
- `is_divergence`: Se há conflito entre fontes

### 3. Regras de Condensação no Prompt

Instruções explícitas para agrupar problemas relacionados:

```text
REGRAS DE CONDENSAÇÃO (MENOS É MAIS):

1. NÃO crie um gap para cada frase. AGRUPE problemas relacionados.
   - Se 3 pessoas reclamam do CRM → UM ÚNICO GAP
   - Se há problemas de follow-up e cadência → UM GAP de "Processo Comercial"

2. IGNORE fatos neutros ou biográficos:
   - "Tatiane trabalha desde 2012" → NÃO É GAP
   - "A empresa tem 50 funcionários" → NÃO É GAP
   
3. FOCO EM PROBLEMAS, RISCOS E OPORTUNIDADES PERDIDAS:
   - Só registre algo que representa uma perda de receita,
     ineficiência, risco operacional ou barreira cultural.

4. LIMITE: Máximo 8 gaps por análise.
   - Se identificar mais de 8, priorize os de maior impacto.
```

### 4. Critérios de Criticidade

```text
CRITÉRIO DE CRITICIDADE:

ALTA (Vermelha):
- Afeta diretamente a receita (perda de deals, churn)
- Impede a operação (sistema crítico quebrado)
- Risco de compliance ou legal

MÉDIA (Amarela):
- Gera ineficiência ou retrabalho significativo
- Reduz produtividade do time
- Afeta experiência do cliente indiretamente

BAIXA (Verde):
- Incômodo ou melhoria estética
- "Nice to have" sem impacto mensurável
- Otimizações de baixa prioridade
```

### 5. Atualização do Hook Frontend

Modificar `useAnalyzeEvidences.ts` para:

1. Receber nova interface de ExtractedGap
2. Mapear campos para insert no banco (já temos as colunas)
3. Remover lógica de deduplicação (IA já consolida)

**Nova interface:**
```typescript
interface ExtractedGap {
  gap: string;          // Vai para `content`
  pilar: Pilar;
  benchmark: string;
  impacto: ImpactType;
  criticidade: CriticalityType;
  is_divergence: boolean;
  divergence_description?: string;
}
```

### 6. Adicionar Valor `cultura` ao ImpactType

Atualizar `src/lib/types.ts`:

```typescript
export type ImpactType = 'receita' | 'eficiencia' | 'risco' | 'cultura';

export const IMPACT_CONFIG: Record<ImpactType, { label: string; icon: string }> = {
  receita: { label: 'Receita', icon: 'TrendingUp' },
  eficiencia: { label: 'Eficiência', icon: 'Zap' },
  risco: { label: 'Risco', icon: 'AlertTriangle' },
  cultura: { label: 'Cultura', icon: 'Users' },
};
```

---

## Fluxo de Dados Atualizado

```text
Reunião (1h de transcrição)
         │
         ▼
┌─────────────────────────────────┐
│    Edge Function (analyze)      │
│                                 │
│  Persona: Consultor Estratégico │
│  Objetivo: Identificar GAPS     │
│  Output: 5-8 gaps consolidados  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Tabela: evidences              │
│                                 │
│  content = gap                  │
│  pilar = pilar                  │
│  benchmark = benchmark          │
│  impact = impacto               │
│  criticality = criticidade      │
│  status = 'pendente'            │
└─────────────────────────────────┘
         │
         ▼
    Tabela Matriz de Diagnóstico
    (5-8 linhas estratégicas)
```

---

## Arquivos a Modificar

1. `supabase/functions/analyze-evidences/index.ts`
   - Reescrever system prompt com nova persona
   - Alterar function calling schema para novos campos
   - Remover filtros de keywords (desnecessário com prompt mais focado)
   - Manter contexto de colaborador (DISC)

2. `src/hooks/useAnalyzeEvidences.ts`
   - Atualizar interface ExtractedEvidence → ExtractedGap
   - Mapear novos campos para insert
   - Remover deduplicação

3. `src/lib/types.ts`
   - Adicionar `cultura` ao ImpactType
   - Atualizar IMPACT_CONFIG

4. Migração SQL (se necessário)
   - Adicionar `cultura` ao CHECK constraint de `impact`

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 50+ evidências fragmentadas | 5-8 gaps estratégicos |
| "João disse que o CRM é ruim" | "Baixa adoção de CRM impacta visibilidade do pipeline" |
| Sem benchmark | Benchmark: "Gestão centralizada com dados confiáveis" |
| Sem priorização | Criticidade: Alta/Média/Baixa |
| Consultor precisa consolidar manualmente | Gaps já chegam consolidados e acionáveis |

---

## Ordem de Execução

1. Migração SQL (adicionar `cultura` ao constraint)
2. Atualizar types.ts
3. Reescrever edge function
4. Atualizar hook frontend
5. Deploy e teste com arquivo real
