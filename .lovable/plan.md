

## Plano: Fase 2 — Edge Functions Core (AI Agents + Refatorações)

### Escopo

5 edge functions (2 novas, 3 refatoradas) + atualização de 3 hooks frontend + config.toml.

Todas as functions migram de OpenAI direta para **Lovable AI Gateway** (`LOVABLE_API_KEY` já existe). O padrão de chamada segue exatamente o que já funciona em `analyze-role-fit`.

---

### 1. Nova: `supabase/functions/ingest-evidence/index.ts`

Recebe `{ file_id, project_id }`. Faz:
- Busca arquivo em `assets`, baixa do storage `project-files`
- Atualiza `processing_queue` em cada etapa (extraindo → classificando → indexando → concluido)
- Extrai texto do arquivo (salva em `assets.extracted_text`)
- Busca `pilares_config` do projeto (ou usa pilares default se null)
- Chama Lovable AI Gateway (`google/gemini-2.5-flash`) para chunking semântico + classificação por pilar
- Salva chunks em `assets.chunks` e `assets.pilar_classificado`
- Insere em `activity_log`
- Modelo: `gemini-2.5-flash` (task simples, alto volume)

System prompt: extrai e classifica trechos relevantes em chunks semânticos por pilar. Não analisa, não gera gaps.

### 2. Nova: `supabase/functions/validate-gaps/index.ts`

Recebe `{ project_id }`. Faz:
- Busca gaps recém-gerados + chunks de assets + `pilares_config`
- Detecta duplicatas semânticas (mesmo pilar)
- Calcula cobertura por pilar (qtd evidências / qtd gaps vs peso do pilar)
- Identifica contradições entre gaps
- Retorna: `{ gaps_removidos, cobertura_por_pilar, alertas, contradicoes }`
- Modelo: `gemini-2.5-flash`
- Arquiva duplicatas (seta `return_reason = 'duplicata'`, status `rejeitado`)

### 3. Refatorar: `analyze-evidences`

Mudanças:
- **Migrar de OpenAI para Lovable AI Gateway** (`google/gemini-2.5-pro` — core do produto)
- **Pilares dinâmicos**: buscar `pilares_config` do projeto via `project_id` (novo parâmetro no body). Se null, usa pilares default hardcoded
- No system prompt, substituir pilares fixos por: `"Os pilares deste projeto são: ${pilares...}"`
- No tool call schema, trocar `enum` hardcoded por lista dinâmica dos pilares
- Adicionar `confidence_score` e `source_chunk_ids` ao output do tool call
- Após gerar gaps, inserir em `activity_log`: "IA gerou X gaps"
- Handle 429/402 do gateway
- **Frontend**: atualizar `useAnalyzeEvidences.ts` para enviar `projectId` no body da function

### 4. Refatorar: `consolidate-evidences`

Mudanças:
- **Migrar de OpenAI para Lovable AI Gateway** (`google/gemini-2.5-flash`)
- Após consolidar, **calcular cobertura por pilar**: conta evidências e gaps por pilar, calcula % baseado nos pesos do `pilares_config`
- Adicionar ao response: `cobertura_por_pilar: [{ pilar, peso, cobertura_pct, status, gaps_count, evidencias_count }]` e `alertas: string[]`
- Inserir em `activity_log`: "IA consolidou X evidências, arquivou Y"
- **Frontend**: atualizar `useConsolidateEvidences.ts` para receber e expor `cobertura_por_pilar`

### 5. Refatorar: `generate-strategic-plan`

Mudanças:
- **Migrar de OpenAI para Lovable AI Gateway** (`google/gemini-2.5-pro` — entregável final)
- Buscar `pilares_config` do projeto (pesos dinâmicos)
- No system prompt, substituir pilares fixos pela config do projeto com pesos
- Adicionar instrução: "Considere os pesos dos pilares na priorização"
- Inserir em `activity_log`: "IA gerou plano com X iniciativas"
- Handle 429/402

### 6. Frontend Hooks

- **`useAnalyzeEvidences.ts`**: adicionar `projectId` ao body da chamada
- **`useConsolidateEvidences.ts`**: expandir interface `ConsolidationResult` com `cobertura_por_pilar` e `alertas`
- **Novo `src/hooks/useProcessingQueue.ts`**: query da `processing_queue` por projeto para monitorar processamento do Vault

### 7. Config

Adicionar ao `supabase/config.toml`:
```toml
[functions.ingest-evidence]
verify_jwt = false

[functions.validate-gaps]
verify_jwt = false
```

---

### Compatibilidade

- Todas as functions mantêm o mesmo nome de endpoint
- `analyze-evidences` agora aceita `projectId` opcional (backward compatible — se não enviado, não busca pilares dinâmicos)
- Os hooks frontend que chamam essas functions continuam funcionando — apenas recebem dados extras no response

### Arquivos criados (4)
1. `supabase/functions/ingest-evidence/index.ts`
2. `supabase/functions/validate-gaps/index.ts`
3. `src/hooks/useProcessingQueue.ts`

### Arquivos editados (6)
4. `supabase/functions/analyze-evidences/index.ts` — migrar para Gateway + pilares dinâmicos
5. `supabase/functions/consolidate-evidences/index.ts` — migrar para Gateway + cobertura
6. `supabase/functions/generate-strategic-plan/index.ts` — migrar para Gateway + pesos
7. `src/hooks/useAnalyzeEvidences.ts` — enviar projectId
8. `src/hooks/useConsolidateEvidences.ts` — expandir tipos
9. `supabase/config.toml` — novas functions

