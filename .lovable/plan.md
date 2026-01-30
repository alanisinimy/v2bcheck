
# Plano: Implementar Feature "Role Fit" (Adequacao ao Cargo)

## Resumo

Adicionar a funcionalidade de analise de adequacao do perfil DISC ao cargo especifico do colaborador. Isso permite refinar cargos genericos como "Comercial" para funcoes especificas (SDR, Closer, etc.) e obter uma analise de compatibilidade comportamental.

## Arquitetura da Solucao

```text
+-------------------+      +----------------------+      +------------------+
|  CollaboratorCard |----->| analyze-role-fit     |----->| Supabase DB      |
|  (editar cargo)   |      | (Edge Function)      |      | (role_fit_level, |
+-------------------+      +----------------------+      |  role_fit_reason)|
                                   |                     +------------------+
                                   v
                           +--------------+
                           | OpenAI API   |
                           | (gpt-4o-mini)|
                           +--------------+
```

## Mudancas no Banco de Dados

Adicionar 2 novas colunas na tabela `collaborators`:

```sql
ALTER TABLE public.collaborators
ADD COLUMN role_fit_level TEXT CHECK (role_fit_level IN ('alto', 'medio', 'baixo')),
ADD COLUMN role_fit_reason TEXT;
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| role_fit_level | TEXT | Nivel de fit: 'alto', 'medio', 'baixo' ou null |
| role_fit_reason | TEXT | Justificativa da IA sobre o fit |

## Modificacoes nos Arquivos

### 1. Hook `useCollaborators.ts`

**Adicionar:**
- Campos `role_fit_level` e `role_fit_reason` na interface `Collaborator`
- Novo hook `useAnalyzeRoleFit()` para chamar a edge function

```typescript
export interface Collaborator {
  // ... campos existentes
  role_fit_level: 'alto' | 'medio' | 'baixo' | null;
  role_fit_reason: string | null;
}

export function useAnalyzeRoleFit() {
  // Chama supabase.functions.invoke('analyze-role-fit')
  // Invalida cache apos sucesso
}
```

### 2. Componente `CollaboratorCard.tsx`

**Modificacoes:**
- Tornar o campo de cargo editavel (inline editing)
- Adicionar badge de Role Fit com cores semanticas
- Adicionar botao "Recalcular Analise"
- Exibir justificativa abaixo do badge

```text
+----------------------------------------+
| TATIANE RODRIGUES        [PDF Auto]    |
| [SDR ▼] <-- Select editavel            |
+----------------------------------------+
| D ████████░░  75                       |
| I ██░░░░░░░░  25                       |
| S ██░░░░░░░░  20                       |
| C █████████░  85                       |
+----------------------------------------+
| [C] Alto C - Analitico                 |
+----------------------------------------+
| [🟢 Fit Alto] [🔄 Recalcular]          |
| O perfil Analitico favorece...         |
+----------------------------------------+
| [🗑️]                                   |
+----------------------------------------+
```

**Componentes de UI:**
- `RoleFitBadge`: Badge colorido (verde/amarelo/vermelho)
- `RoleSelector`: Select/Combobox com opcoes de cargo
- Botao de recalcular com loading state

### 3. Nova Edge Function `analyze-role-fit/index.ts`

**Endpoint:** `POST /analyze-role-fit`

**Input:**
```json
{
  "collaboratorId": "uuid",
  "collaboratorName": "Tatiane",
  "role": "SDR",
  "discProfile": { "dom": 75, "inf": 25, "est": 20, "conf": 85 }
}
```

**Output:**
```json
{
  "role_fit_level": "alto",
  "role_fit_reason": "O perfil Analitico (Alto C) favorece a disciplina..."
}
```

**Prompt do Especialista:**
```text
Voce e um especialista em Gestao de Talentos em Vendas B2B.

REGRAS DE OURO POR CARGO:
- SDR/BDR: Beneficia-se de C (Processo) e D (Resultado) ou S (Constancia). 
  Alto I pode ser ruim (perde foco em tarefas repetitivas).
- Closer/AE: Beneficia-se de Alto D (Fechamento) e Alto I (Influencia). 
  Alto C pode travar a negociacao.
- Farmer/CS: Beneficia-se de Alto S (Relacionamento) e Alto I (Empatia).
- Gerente: Precisa de D (Lideranca) + equilibrio para gerenciar perfis diversos.
- BDR Outbound: Alto D e C (metodico e assertivo).

TAREFA:
Analise se o perfil DISC de [Nome] e adequado para o cargo [Cargo].

PERFIL:
- D (Dominancia): X%
- I (Influencia): Y%
- S (Estabilidade): Z%
- C (Conformidade): W%

Responda em JSON:
{
  "fit_level": "alto" | "medio" | "baixo",
  "reason": "Justificativa em 1-2 frases focando no impacto pratico"
}
```

### 4. Pagina `Team.tsx`

**Adicionar:**
- Handler `handleUpdateRole` para salvar cargo editado
- Handler `handleAnalyzeRoleFit` para chamar a edge function
- Estado `analyzingFitId` para loading

### 5. Atualizar `supabase/config.toml`

Adicionar configuracao da nova edge function:

```toml
[functions.analyze-role-fit]
verify_jwt = false
```

## Lista de Cargos Predefinidos

Para o seletor de cargo, usar opcoes comuns em vendas B2B:

| Cargo | Descricao |
|-------|-----------|
| SDR | Sales Development Representative |
| BDR | Business Development Representative |
| Closer | Account Executive / Closer |
| Farmer | Customer Success / Account Manager |
| Gerente | Sales Manager |
| Diretor | Sales Director |
| Consultor | Sales Consultant |
| Outro | Cargo customizado |

## Fluxo de Usuario

1. Usuario vai para aba "Time"
2. Clica no cargo atual (ex: "Comercial")
3. Seleciona novo cargo (ex: "SDR") no dropdown
4. Sistema salva e chama automaticamente `analyze-role-fit`
5. Badge de fit aparece com cor apropriada
6. Usuario pode clicar em "Recalcular" se quiser nova analise

## Secao Tecnica

### Ordem de Implementacao

1. Migracao SQL (adicionar colunas)
2. Atualizar `useCollaborators.ts` (interface + hook)
3. Criar edge function `analyze-role-fit`
4. Atualizar `CollaboratorCard.tsx` (UI completa)
5. Atualizar `Team.tsx` (handlers)
6. Atualizar `config.toml`

### Dependencias

- Nenhuma nova dependencia necessaria
- Reutiliza componentes UI existentes (Badge, Select, Button)
- Reutiliza padroes de edge functions existentes

### Tratamento de Erros

- Se analise falhar: toast de erro, limpar estado de loading
- Se cargo for "Outro": permitir input customizado
- Se perfil DISC nao existir: desabilitar analise de fit
