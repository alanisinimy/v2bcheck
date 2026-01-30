
# Inteligencia de Pessoas e Estrategia - Fluxo Automatizado

Sistema completo para auto-cadastro de colaboradores via upload de PDFs DISC, inferencia de perfil por IA, e geracao automatica de plano de acao estrategico.

---

## Visao Geral da Arquitetura

```text
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   THE VAULT     │────>│  EDGE FUNCTIONS  │────>│   SUPABASE DB   │
│  Upload PDFs    │     │  analyze-disc    │     │  collaborators  │
│  source=DISC    │     │  analyze-evid    │     │  initiatives    │
└─────────────────┘     │  generate-plan   │     │  evidences      │
                        │  infer-profile   │     └─────────────────┘
                        └──────────────────┘             │
                                                         v
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   /plan         │<────│  STRATEGIC       │<────│  Time + Matriz  │
│  Plano de Acao  │     │  AGENT (AI)      │     │  Dados Cruzados │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 1. Banco de Dados (Novas Tabelas)

### 1.1 Tabela: collaborators

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `project_id` | UUID | FK para projects |
| `name` | TEXT | Nome do colaborador |
| `role` | TEXT | Cargo (nullable) |
| `disc_profile` | JSONB | { dom: number, inf: number, est: number, conf: number } |
| `profile_source` | ENUM | 'pdf_auto', 'ai_inferred', 'manual' |
| `primary_style` | TEXT | Estilo dominante (D, I, S, C) |
| `created_at` | TIMESTAMP | Auto |
| `updated_at` | TIMESTAMP | Auto |

### 1.2 Tabela: initiatives

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `id` | UUID | Chave primaria |
| `project_id` | UUID | FK para projects |
| `title` | TEXT | Titulo da iniciativa |
| `description` | TEXT | Descricao detalhada |
| `impact` | ENUM | 'low', 'medium', 'high' |
| `effort` | ENUM | 'low', 'medium', 'high' |
| `status` | ENUM | 'draft', 'approved', 'in_progress', 'done' |
| `target_pilar` | ENUM | Pilar alvo (opcional) |
| `created_at` | TIMESTAMP | Auto |

### 1.3 Novos ENUMs

```text
profile_source_type: 'pdf_auto' | 'ai_inferred' | 'manual'
initiative_impact: 'low' | 'medium' | 'high'
initiative_effort: 'low' | 'medium' | 'high'
initiative_status: 'draft' | 'approved' | 'in_progress' | 'done'
```

### 1.4 Atualizar source_type

Adicionar ao ENUM existente:
- `perfil_disc` - para PDFs de perfil DISC

---

## 2. Auto-Cadastro via Upload (DISC)

### 2.1 Atualizar SourceTypeModal

Adicionar opcao "Perfil DISC" na lista de tipos de fonte:

```text
Opcoes atuais + Nova:
├── Entrevista (CEO/Diretoria)
├── Entrevista (Time/Operacao)
├── ...
└── [NOVO] Perfil DISC  📋
```

### 2.2 Atualizar types.ts

```text
SourceType = ... | 'perfil_disc'

SOURCE_TYPES = {
  ...
  perfil_disc: { label: 'Perfil DISC', icon: '📋' }
}
```

### 2.3 Nova Edge Function: analyze-disc

Criar `supabase/functions/analyze-disc/index.ts`:

```text
Entrada:
├── content: string (texto extraido do PDF)
├── projectId: string
├── assetId: string

Logica:
1. Prompt especializado para extrair:
   - Nome do Colaborador
   - Cargo (se houver)
   - Perfil DISC (valores numericos ou descritivos)
   - Estilo Dominante (D, I, S, ou C)

2. Verificar se colaborador existe (by name + project_id)
   - Se NAO: INSERT
   - Se SIM: UPDATE disc_profile

3. Gerar evidencia automatica:
   "Tatiane Silva tem perfil Comunicador (Alto I), 
    o que favorece relacionamento com clientes mas 
    requer gestao de foco em tarefas repetitivas."

Saida:
├── collaborator: { id, name, disc_profile }
├── evidence: { id, content, pilar: 'pessoas' }
└── isNew: boolean
```

### 2.4 Atualizar Vault.tsx

Logica condicional no processFiles:

```text
if (sourceType === 'perfil_disc') {
  // Chamar analyze-disc
  // Retornar mensagem: "Colaborador X cadastrado automaticamente"
} else {
  // Fluxo atual: analyze-evidences
}
```

---

## 3. Nova Pagina: Time (/team)

### 3.1 Estrutura da Pagina

```text
┌─────────────────────────────────────────────────────────────┐
│ Time do Projeto                            [+ Add Manual]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ Tatiane S.  │ │ Roberto M.  │ │ CEO         │             │
│ │ Vendedora   │ │ Gerente     │ │ (sem DISC)  │             │
│ │ ████████░░  │ │ ██████░░░░  │ │ [Inferir]   │             │
│ │ Alto I      │ │ Alto D      │ │             │             │
│ │ 📋 PDF Auto │ │ 📋 PDF Auto │ │ ✍️ Manual   │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
├─────────────────────────────────────────────────────────────┤
│ Distribuicao DISC do Time                                   │
│ ┌───────────────────────────────────────────┐               │
│ │ D: ███░░░░░░░  20%                        │               │
│ │ I: ████████░░  60%                        │               │
│ │ S: ██░░░░░░░░  10%                        │               │
│ │ C: ██░░░░░░░░  10%                        │               │
│ └───────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Componentes

| Componente | Descricao |
|------------|-----------|
| `TeamPage.tsx` | Pagina principal /team |
| `CollaboratorCard.tsx` | Card individual do colaborador |
| `AddCollaboratorDialog.tsx` | Modal para cadastro manual |
| `DiscProfileBars.tsx` | Visualizacao das barras DISC |
| `TeamDistributionChart.tsx` | Grafico de distribuicao do time |

### 3.3 Hooks

| Hook | Funcao |
|------|--------|
| `useCollaborators(projectId)` | Listar colaboradores |
| `useCreateCollaborator()` | Criar colaborador manual |
| `useUpdateCollaborator()` | Atualizar DISC |
| `useInferProfile()` | Chamar IA para inferir perfil |

---

## 4. Inferencia de Perfil DISC

### 4.1 Nova Edge Function: infer-disc-profile

Criar `supabase/functions/infer-disc-profile/index.ts`:

```text
Entrada:
├── projectId: string
├── collaboratorId: string
├── collaboratorName: string

Logica:
1. Buscar todas as evidencias do projeto
2. Filtrar mencoes ao nome do colaborador
3. Analisar padroes de comportamento verbal:
   - Velocidade de decisao → D
   - Entusiasmo, storytelling → I
   - Paciencia, escuta → S
   - Perguntas detalhadas, cautela → C

4. Gerar estimativa DISC baseada em comportamento

Prompt especializado:
"Voce e um especialista em DISC. Analise os trechos 
de entrevista abaixo onde [Nome] fala e estime o 
perfil DISC baseado no comportamento verbal."

Saida:
├── disc_profile: { dom, inf, est, conf }
├── primary_style: 'D' | 'I' | 'S' | 'C'
├── reasoning: string (justificativa)
└── confidence: number (0-100)
```

### 4.2 UI: Botao Inferir

No `CollaboratorCard.tsx`:

```text
{!collaborator.disc_profile && (
  <Button onClick={handleInferProfile}>
    🕵️ Inferir Perfil via IA
  </Button>
)}
```

---

## 5. Gerador de Plano de Acao (/plan)

### 5.1 Nova Pagina: Plan.tsx

```text
┌─────────────────────────────────────────────────────────────┐
│ Plano Estrategico               [🤖 Gerar Plano com IA]    │
├─────────────────────────────────────────────────────────────┤
│ Contexto Analisado:                                         │
│ ├── 24 evidencias validadas                                 │
│ ├── 5 colaboradores mapeados                                │
│ └── Perfil dominante do time: Alto I (60%)                  │
├─────────────────────────────────────────────────────────────┤
│ Iniciativas Sugeridas:                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 1. Gamificacao de CRM                                   │ │
│ │    Impacto: Alto  |  Esforco: Medio                     │ │
│ │    "Time Alto I responde melhor a desafios e rankings   │ │
│ │     do que a cobrancas formais de preenchimento."       │ │
│ │    [Aprovar] [Editar] [Descartar]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 2. Assistente Comercial                                 │ │
│ │    Impacto: Alto  |  Esforco: Alto                      │ │
│ │    "Automatizar o preenchimento via gravacao alivia     │ │
│ │     o perfil comunicador de tarefas burocraticas."      │ │
│ │    [Aprovar] [Editar] [Descartar]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Nova Edge Function: generate-strategic-plan

Criar `supabase/functions/generate-strategic-plan/index.ts`:

```text
Entrada:
├── projectId: string

Logica:
1. Buscar evidencias validadas (status = 'validado')
2. Buscar colaboradores do projeto
3. Calcular perfil dominante do time
4. Enviar para IA com prompt estrategico

Prompt:
"Voce e um consultor de vendas B2B. Analise os problemas 
encontrados cruzando com o perfil comportamental do time.

PROBLEMAS (Evidencias):
[lista de evidencias validadas]

PERFIL DO TIME:
- 60% Alto I (Comunicadores)
- 20% Alto D (Dominantes)
- 10% Alto S (Estaveis)
- 10% Alto C (Conformes)

REGRA: Solucoes devem considerar a psicologia do time.
Exemplo: Se o problema e 'Falta de preenchimento de CRM' 
e o time e 'Alto I', a solucao NAO e cobrar mais, 
e sim 'Gamificacao' ou 'Assistente automatico'.

Gere 3 a 5 iniciativas estrategicas."

Saida:
├── initiatives: Array<{
│     title: string,
│     description: string,
│     impact: 'low' | 'medium' | 'high',
│     effort: 'low' | 'medium' | 'high',
│     reasoning: string
│   }>
└── teamInsight: string (resumo do cruzamento)
```

### 5.3 Componentes

| Componente | Descricao |
|------------|-----------|
| `PlanPage.tsx` | Pagina principal /plan |
| `InitiativeCard.tsx` | Card de cada iniciativa |
| `GeneratePlanButton.tsx` | Botao que dispara geracao |
| `TeamInsightSummary.tsx` | Resumo do contexto analisado |

### 5.4 Hooks

| Hook | Funcao |
|------|--------|
| `useInitiatives(projectId)` | Listar iniciativas |
| `useGeneratePlan()` | Chamar edge function |
| `useUpdateInitiative()` | Aprovar/editar iniciativa |

---

## 6. Navegacao

### 6.1 Atualizar AppSidebar.tsx

```text
navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'The Vault', path: '/vault', icon: Upload },
  { label: 'Matriz', path: '/matriz', icon: Grid3X3 },
  { label: 'Time', path: '/team', icon: Users },        // NOVO
  { label: 'Plano', path: '/plan', icon: Lightbulb },   // NOVO
]
```

### 6.2 Atualizar App.tsx

```text
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/vault" element={<Vault />} />
  <Route path="/matriz" element={<Matriz />} />
  <Route path="/team" element={<Team />} />    // NOVO
  <Route path="/plan" element={<Plan />} />    // NOVO
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## 7. Resumo de Arquivos

### Migracoes SQL

| Arquivo | Descricao |
|---------|-----------|
| Migracao #1 | Criar ENUMs e tabela collaborators |
| Migracao #2 | Criar tabela initiatives |
| Migracao #3 | Adicionar 'perfil_disc' ao source_type |

### Edge Functions

| Arquivo | Descricao |
|---------|-----------|
| `analyze-disc/index.ts` | **NOVO** - Extrai DISC de PDF |
| `infer-disc-profile/index.ts` | **NOVO** - Infere DISC de entrevistas |
| `generate-strategic-plan/index.ts` | **NOVO** - Gera plano estrategico |

### Tipos e Hooks

| Arquivo | Descricao |
|---------|-----------|
| `src/lib/types.ts` | Adicionar Collaborator, Initiative, novos ENUMs |
| `src/hooks/useCollaborators.ts` | **NOVO** - CRUD colaboradores |
| `src/hooks/useInitiatives.ts` | **NOVO** - CRUD iniciativas |
| `src/hooks/useAnalyzeEvidences.ts` | Atualizar para desviar DISC |

### Paginas

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/Team.tsx` | **NOVO** - Pagina do time |
| `src/pages/Plan.tsx` | **NOVO** - Pagina do plano |

### Componentes

| Arquivo | Descricao |
|---------|-----------|
| `src/components/team/CollaboratorCard.tsx` | **NOVO** |
| `src/components/team/AddCollaboratorDialog.tsx` | **NOVO** |
| `src/components/team/DiscProfileBars.tsx` | **NOVO** |
| `src/components/plan/InitiativeCard.tsx` | **NOVO** |
| `src/components/plan/GeneratePlanButton.tsx` | **NOVO** |
| `src/components/vault/SourceTypeModal.tsx` | Adicionar opcao DISC |
| `src/components/layout/AppSidebar.tsx` | Adicionar rotas |

---

## 8. Fluxo Completo

```text
FASE 1: Ingestao
┌─────────────────────────────────────────────────────────────┐
│ 1. Consultor sobe 10 PDFs DISC no Vault                     │
│ 2. Sistema classifica como "Perfil DISC"                    │
│ 3. Edge Function extrai nome + perfil de cada PDF           │
│ 4. Colaboradores criados automaticamente                    │
│ 5. Evidencias de "Pessoas" geradas automaticamente          │
└─────────────────────────────────────────────────────────────┘
                              ↓
FASE 2: Completar Time
┌─────────────────────────────────────────────────────────────┐
│ 6. Consultor acessa /team e ve os 10 colaboradores          │
│ 7. Adiciona CEO manualmente (nao tinha PDF)                 │
│ 8. Clica "Inferir Perfil" no CEO                            │
│ 9. IA le entrevistas e estima o DISC do CEO                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
FASE 3: Estrategia
┌─────────────────────────────────────────────────────────────┐
│ 10. Consultor acessa /plan                                  │
│ 11. Clica "Gerar Plano com IA"                              │
│ 12. Sistema cruza problemas + perfil do time                │
│ 13. IA gera 3-5 iniciativas estrategicas personalizadas     │
│ 14. Consultor aprova/edita e apresenta ao cliente           │
└─────────────────────────────────────────────────────────────┘
```

---

## Resultado Final

1. **Zero digitacao**: Upload de PDFs cria colaboradores sozinho
2. **Inferencia inteligente**: CEO/diretores sem PDF tem perfil estimado pela IA
3. **Cruzamento estrategico**: Plano considera psicologia do time
4. **Fluxo integrado**: Vault -> Time -> Matriz -> Plano
