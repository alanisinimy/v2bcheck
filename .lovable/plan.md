

## Plano: Backend v3 — Reestruturação de Edge Functions e Banco de Dados

### Diagnóstico do Prompt vs. Realidade

O prompt referencia tabelas que **não existem** (`gaps`, `vault_files`, `strategic_plans`). Os nomes reais são:
- `gaps` → `evidences`
- `vault_files` → `assets`
- `strategic_plans` → `initiatives`

O campo `projects.sector`, `projects.company_size` e `projects.custom_pilares` **já existem** (adicionados no wizard). O `verify_jwt = false` com `getClaims()` manual é o padrão correto do Lovable Cloud — o prompt sugere mudar para `verify_jwt = true`, mas isso quebraria a autenticação. Vamos manter o padrão atual.

Dado o volume (5 tabelas, 5 novas functions, 4 refatorações, 3 triggers), este plano será executado em **3 fases incrementais** para não quebrar o frontend.

---

### FASE 1 — Fundação (tabelas, triggers, auth fix)

**Migração SQL:**

1. **`project_templates`** — templates de pilares por setor (com seed data para SaaS, Indústria, Serviços)
2. **`activity_log`** — log de atividades com index por project_id + created_at DESC
3. **`processing_queue`** — fila de processamento do Vault com status granular
4. **Alterar `projects`**: adicionar `template_id` (FK para project_templates), `current_phase` (text, default 'vault'), `pilares_config` (jsonb)
5. **Alterar `evidences`**: adicionar `confidence_score` (float, default 1.0), `return_reason` (text), `source_chunks` (jsonb, default '[]')
6. **Alterar `assets`**: adicionar `processing_status` (text, default 'pendente'), `extracted_text` (text), `chunks` (jsonb, default '[]'), `pilar_classificado` (text)
7. **RLS** em todas as tabelas novas usando `is_project_member()`
8. **`project_templates`**: SELECT para todos os authenticated (templates globais)

**Tabelas adiadas para Fase 3:** `quick_notes` e `export_jobs` (dependem das functions correspondentes)

**Triggers:**
- `trg_log_gap_change`: ao mudar status de `evidences`, insere em `activity_log` (adaptar para usar `content` em vez de `description`)
- `trg_recalculate_phase`: ao INSERT/UPDATE em `evidences` ou `assets`, recalcula `projects.current_phase` baseado em contagens
- Trigger de upload (`trg_file_upload`): ao inserir em `assets`, cria entrada em `processing_queue`

**Auth fix:** Adicionar verificação `getClaims()` em `analyze-people-data` (única function sem auth)

**Frontend:** Atualizar `useDashboardData.ts` para buscar `activity_log` do banco em vez de derivar de timestamps

---

### FASE 2 — Edge Functions Core (ingestor, validador, refatorações)

**Nova: `ingest-evidence`**
- Recebe `file_id` + `project_id`
- Atualiza `processing_queue` em cada etapa (extraindo → classificando → indexando → concluido)
- Extrai texto, faz chunking semântico via LLM, classifica por pilar
- Salva chunks no campo `assets.chunks` e `assets.extracted_text`
- Insere em `activity_log`
- Modelo: `google/gemini-2.5-flash` via Lovable AI Gateway (task simples, alto volume)

**Nova: `validate-gaps`**
- Recebe gaps gerados + chunks, detecta duplicatas, calcula cobertura por pilar
- Modelo: `google/gemini-2.5-flash` via Lovable AI Gateway

**Refatorar: `analyze-evidences`**
- Adicionar suporte a `pilares_config` dinâmicos (ler do projeto em vez de hardcoded)
- Adicionar `confidence_score` e `source_chunk_ids` ao output
- Se `confidence_score < 0.6`, setar `return_reason = 'confianca_baixa'`
- Inserir em `activity_log` após gerar gaps
- Migrar de OpenAI direta para Lovable AI Gateway com `google/gemini-2.5-pro` (core do produto)

**Refatorar: `consolidate-evidences`**
- Adicionar cálculo de cobertura por pilar ao output
- Adicionar alertas para pilares com cobertura fraca
- Inserir em `activity_log`

**Refatorar: `generate-strategic-plan`**
- Ler `pilares_config` do projeto (pesos dinâmicos)
- Adicionar parâmetro `tipo_export` ('plano' | 'sintese' | 'completo')
- Migrar para Lovable AI Gateway com `google/gemini-2.5-pro` (entregável final)
- Inserir em `activity_log`

**Manter sem alterações:** `analyze-disc`, `infer-disc-profile`, `extract-project-context`, `analyze-role-fit`

**Frontend:**
- Atualizar `useAnalyzeEvidences.ts` para passar `pilares_config`
- Atualizar `useConsolidateEvidences.ts` para receber cobertura no response
- Atualizar `usePlanData.ts` para suportar `tipo_export`
- Criar hook `useProcessingQueue.ts` para monitorar fila de processamento
- Criar hook `useActivityLog.ts` para o feed do dashboard

---

### FASE 3 — Features Adicionais (export, quick notes)

**Tabelas:** `quick_notes`, `export_jobs` + RLS

**Storage:** Bucket `exports` (privado)

**Nova: `generate-export`**
- Gera PDF/XLSX a partir dos dados do banco
- Modelo: `google/gemini-2.5-pro` via Lovable AI Gateway (narrativa para cliente)
- Controla status via `export_jobs`

**Nova: `process-quick-note`**
- Processa notas rápidas do consultor, classifica por pilar
- Modelo: `google/gemini-2.5-flash` via Lovable AI Gateway

**Nova: `calculate-project-state`**
- Lógica determinística sem IA
- Calcula stepper, stats, next_step, processing queue
- Substitui `useDashboardData.ts` computado no frontend

---

### Modelo de IA por Function

| Função | Atual | Proposto | Via |
|--------|-------|----------|-----|
| ingest-evidence (nova) | — | gemini-2.5-flash | Lovable AI Gateway |
| analyze-evidences | gpt-4o-mini (OpenAI) | gemini-2.5-pro | Lovable AI Gateway |
| validate-gaps (nova) | — | gemini-2.5-flash | Lovable AI Gateway |
| consolidate-evidences | gpt-4o-mini (OpenAI) | gemini-2.5-flash | Lovable AI Gateway |
| generate-strategic-plan | gpt-4o-mini (OpenAI) | gemini-2.5-pro | Lovable AI Gateway |
| generate-export (nova) | — | gemini-2.5-pro | Lovable AI Gateway |
| process-quick-note (nova) | — | gemini-2.5-flash | Lovable AI Gateway |
| calculate-project-state (nova) | — | Sem IA | — |
| analyze-disc | gpt-4o-mini (OpenAI) | gpt-4o-mini | OpenAI (manter) |
| infer-disc-profile | gpt-4o-mini (OpenAI) | gpt-4o-mini | OpenAI (manter) |
| extract-project-context | gpt-4o-mini (OpenAI) | gpt-4o-mini | OpenAI (manter) |
| analyze-role-fit | gemini-flash (Gateway) | gemini-flash | Lovable AI Gateway (manter) |
| analyze-people-data | gpt-4o-mini (OpenAI) | gpt-4o-mini | OpenAI (manter + fix auth) |

---

### Ordem de Implementação (Fase 1 primeiro)

A Fase 1 é a prioridade — cria a infraestrutura sem quebrar nada. As Fases 2 e 3 podem ser feitas em prompts subsequentes.

**Fase 1 (este prompt):**
1. Migração SQL: tabelas + alterações + triggers + RLS
2. Fix auth em `analyze-people-data`
3. Hook `useActivityLog` + atualizar dashboard para usar `activity_log`

**Estimativa:** ~15 arquivos criados/editados

