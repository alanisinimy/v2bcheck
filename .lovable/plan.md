
# Entrada de Dados Manuais e Contexto do Projeto

Duas novas funcionalidades para permitir que o consultor registre informacoes que nao vieram de arquivos gravados.

---

## Visao Geral

| Feature | Descricao |
|---------|-----------|
| **1. Aba Visao Geral** | Formulario de contexto do projeto no Dashboard |
| **2. Evidencia Manual** | Dialog funcional para criar evidencias na Matriz |

---

## Feature 1: Aba "Visao Geral" no Dashboard

### 1.1 Schema do Banco de Dados

Adicionar novas colunas na tabela `projects`:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| `client_context` | TEXT | Cenario atual da empresa |
| `main_pain_points` | TEXT | Dores latentes relatadas |
| `project_goals` | TEXT | Definicao de sucesso |

### 1.2 Novo Componente: ProjectOverviewForm

Criar `src/components/dashboard/ProjectOverviewForm.tsx`:

```text
Formulario com:
├── Textarea: "Contexto da Empresa"
│   └── Placeholder: "Descreva o cenario atual da empresa..."
├── Textarea: "Dores Latentes" 
│   └── Placeholder: "Quais sao as principais dores relatadas?"
├── Textarea: "Objetivos do Projeto"
│   └── Placeholder: "O que define sucesso neste diagnostico?"
└── Botao: "Salvar Alteracoes"
```

### 1.3 Dashboard com Tabs

Atualizar `src/pages/Dashboard.tsx`:

```text
┌─────────────────────────────────────────────────┐
│ [Metricas] [Visao Geral]                        │  ← Tabs
├─────────────────────────────────────────────────┤
│ Conteudo da aba selecionada                     │
└─────────────────────────────────────────────────┘
```

**Aba Metricas:** Conteudo atual do Dashboard (cards, pilares, divergencias)
**Aba Visao Geral:** Formulario de contexto do projeto

### 1.4 Hook de Update

Criar `src/hooks/useUpdateProject.ts`:

```text
useUpdateProject()
├── Aceita: { projectId, client_context, main_pain_points, project_goals }
├── Executa: UPDATE na tabela projects
└── Invalida: queries do projeto atual
```

---

## Feature 2: Evidencia Manual na Matriz

### 2.1 Atualizar Source Types

Adicionar nova opcao ao ENUM `source_type`:

| Valor | Label |
|-------|-------|
| `observacao_consultor` | "Observacao do Consultor" |

### 2.2 Novo Tipo: Evidence Type

Adicionar coluna na tabela `evidences`:

| Coluna | Tipo | Default | Descricao |
|--------|------|---------|-----------|
| `evidence_type` | ENUM | 'fato' | Fato, Divergencia, Ponto Forte |

### 2.3 Novo Componente: AddEvidenceDialog

Criar `src/components/matriz/AddEvidenceDialog.tsx`:

```text
Dialog com:
├── Titulo: "Nova Evidencia Manual"
├── Campos:
│   ├── Textarea: "Conteudo da Evidencia" (obrigatorio)
│   │   └── Placeholder: "Descreva a evidencia observada..."
│   ├── Select: "Pilar" (obrigatorio)
│   │   └── Opcoes: Pessoas, Processos, Dados, Tecnologia, Gestao
│   ├── Select: "Fonte/Origem" (obrigatorio)
│   │   └── Opcoes: Lista de source_types + "Observacao do Consultor"
│   └── Select: "Tipo" (obrigatorio)
│       └── Opcoes: Fato, Divergencia, Ponto Forte
├── Logica:
│   ├── Se tipo = "Divergencia": exibe campo extra para descricao
│   └── Status = 'validado' automaticamente (evidencia manual = validada)
└── Botao: "Salvar Evidencia"
```

### 2.4 Atualizar Matriz.tsx

Substituir o botao de teste por um botao que abre o dialog:

```text
Antes:  <Button>Add Evidencia (Teste)</Button>
Depois: <Button>+ Nova Evidencia</Button> → Abre AddEvidenceDialog
```

### 2.5 Atualizar Hook useCreateEvidence

Adicionar suporte para:
- `evidence_type` (fato | divergencia | ponto_forte)
- Status default 'validado' para evidencias manuais

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| **Migracao SQL #1** | Adicionar colunas context na tabela projects |
| **Migracao SQL #2** | Adicionar ENUM evidence_type e coluna na evidences |
| **Migracao SQL #3** | Adicionar 'observacao_consultor' ao ENUM source_type |
| `src/lib/types.ts` | Atualizar tipos Project, SourceType, adicionar EvidenceType |
| `src/hooks/useUpdateProject.ts` | **NOVO** - Hook para update do contexto |
| `src/components/dashboard/ProjectOverviewForm.tsx` | **NOVO** - Formulario de contexto |
| `src/pages/Dashboard.tsx` | Adicionar tabs (Metricas + Visao Geral) |
| `src/components/matriz/AddEvidenceDialog.tsx` | **NOVO** - Dialog para evidencia manual |
| `src/pages/Matriz.tsx` | Integrar AddEvidenceDialog |
| `src/hooks/useCreateEvidence.ts` | Adicionar evidence_type |
| `src/components/matriz/EvidenceCard.tsx` | Exibir badge do evidence_type |

---

## Fluxo de Uso

### Feature 1: Contexto do Projeto
```text
1. Usuario acessa Dashboard
2. Clica na aba "Visao Geral"
3. Preenche campos de contexto
4. Clica "Salvar Alteracoes"
5. Dados persistidos na tabela projects
```

### Feature 2: Evidencia Manual
```text
1. Usuario acessa Matriz de Diagnostico
2. Clica em "+ Nova Evidencia"
3. Dialog abre com formulario
4. Preenche: conteudo, pilar, fonte, tipo
5. Clica "Salvar Evidencia"
6. INSERT na tabela evidences com status = 'validado'
7. Card aparece na Matriz com badge do tipo
```

---

## Resultado Esperado

1. **Dashboard**: Nova aba "Visao Geral" para documentar contexto do projeto
2. **Matriz**: Botao "+ Nova Evidencia" abre dialog funcional
3. **Evidencias Manuais**: Salvas com status validado e fonte apropriada
4. **Cards na Matriz**: Exibem tipo da evidencia (Fato, Divergencia, Ponto Forte)
