

# Plano: Implementar "Auto-Fill Context" (Preenchimento Inteligente)

## Resumo

Criar funcionalidade que analisa automaticamente todas as transcrições/reuniões do projeto para extrair e preencher os campos de contexto na aba "Visão Geral". Isso evita que o Plano Estratégico faça sugestões genéricas (ex: "implementar CRM" quando o cliente já usa HubSpot).

## Arquitetura da Solução

```text
+------------------------+      +-------------------------+      +----------------+
| ProjectOverviewForm    |----->| extract-project-context |----->| projects table |
| "Extrair das Reuniões" |      | (Edge Function)         |      | client_context |
+------------------------+      +-------------------------+      | main_pain_points|
                                        |                        | project_goals  |
                                        v                        +----------------+
                                +---------------+
                                | Storage       |
                                | (arquivos txt)|
                                +---------------+
                                        |
                                        v
                                +---------------+
                                | OpenAI API    |
                                | (gpt-4o-mini) |
                                +---------------+
```

## Fluxo de Usuario

1. Usuario vai para Dashboard > Aba "Visão Geral"
2. Clica no botão "Extrair Contexto das Reuniões"
3. Sistema exibe loading: "Analisando transcrições..."
4. Edge function busca todos os arquivos de texto do projeto
5. IA extrai contexto, stack tecnológico e dores latentes
6. Campos são preenchidos automaticamente na tela
7. Usuario pode revisar e clicar em "Salvar Alterações"

## Modificações nos Arquivos

### 1. Nova Edge Function `extract-project-context/index.ts`

**Endpoint:** `POST /extract-project-context`

**Input:**
```json
{
  "projectId": "uuid"
}
```

**Lógica:**
1. Buscar assets do projeto (source_type != 'perfil_disc', status = 'completed')
2. Para cada asset .txt, baixar conteúdo do Storage
3. Concatenar todos os textos (limite de tokens)
4. Enviar para GPT-4o-mini com prompt de Auditor

**Prompt do Especialista:**
```text
Você é um Auditor Sênior de Diagnóstico Comercial.

Leia todas as transcrições de reuniões deste projeto e extraia 
um resumo executivo para preencher 3 campos:

1. CONTEXTO DA EMPRESA:
   - O que a empresa faz
   - Tempo de mercado / tamanho do time
   - Modelo de venda (Inside Sales, Field Sales, PLG)
   - Segmento e ticket médio

2. STACK TECNOLÓGICO & PROCESSOS:
   - Liste TODAS as ferramentas citadas (CRM, ERP, planilhas)
   - Como cada ferramenta é usada atualmente
   - Integrações existentes
   - Ferramentas que estão sendo avaliadas/desejadas

3. DORES LATENTES:
   - Problemas citados repetidamente
   - Frustrações do time
   - Gaps identificados
   - Metas não atingidas

REGRA CRÍTICA: Seja factual. Extraia apenas o que foi 
explicitamente dito nas transcrições.

Responda em JSON:
{
  "client_context": "Texto resumido do contexto...",
  "main_pain_points": "Lista de dores...",
  "project_goals": "Objetivos inferidos..."
}
```

**Output:**
```json
{
  "client_context": "Empresa de tecnologia B2B com 50 funcionários, 8 anos de mercado. Utiliza HubSpot como CRM principal...",
  "main_pain_points": "Time não preenche o CRM consistentemente. Forecast impreciso. Alta rotatividade de SDRs...",
  "project_goals": "Aumentar previsibilidade do pipeline. Melhorar adoção do CRM. Reduzir turnover."
}
```

### 2. Novo Hook `useExtractContext.ts`

```typescript
export function useExtractContext() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke(
        'extract-project-context',
        { body: { projectId } }
      );
      if (error || data.error) throw new Error(data?.error || error.message);
      return data;
    },
  });
}
```

### 3. Atualizar `ProjectOverviewForm.tsx`

**Adicionar:**
- Botão "Extrair Contexto das Reuniões" no topo do form
- Estado de loading com mensagem "Analisando transcrições..."
- Após sucesso, preencher os 3 campos e mostrar toast
- Manter mudanças como "não salvas" para usuário revisar

**Layout:**
```text
+--------------------------------------------------+
| [✨ Extrair Contexto das Reuniões]               |
+--------------------------------------------------+
|                                                  |
| 🏢 Contexto da Empresa                           |
| [textarea preenchida automaticamente]            |
|                                                  |
| ⚠️ Dores Latentes                                |
| [textarea preenchida automaticamente]            |
|                                                  |
| 🎯 Objetivos do Projeto                          |
| [textarea preenchida automaticamente]            |
|                                                  |
|                        [Salvar Alterações]       |
+--------------------------------------------------+
```

### 4. Atualizar `generate-strategic-plan/index.ts`

**Adicionar:**
1. Buscar dados da tabela `projects` (client_context, main_pain_points, project_goals)
2. Incluir no prompt como "CONTEXTO OBRIGATÓRIO"
3. Adicionar regra de não duplicar ferramentas existentes

**Novo trecho do prompt:**
```text
CONTEXTO OBRIGATÓRIO DA EMPRESA:
${project.client_context || 'Não informado'}

STACK TECNOLÓGICO EXISTENTE:
${project.main_pain_points || 'Não informado'}

REGRA CRÍTICA: Se o contexto menciona que a empresa JÁ USA uma 
ferramenta (ex: HubSpot, Salesforce), NUNCA sugira "Implementar" 
ou "Comprar". Sugira:
- "Auditoria de [Ferramenta]"
- "Otimização de [Ferramenta]"  
- "Treinamento de [Ferramenta]"
```

### 5. Atualizar `supabase/config.toml`

```toml
[functions.extract-project-context]
verify_jwt = false
```

## Tratamento de Casos Especiais

| Cenário | Comportamento |
|---------|---------------|
| Nenhum arquivo de texto | Mostrar toast: "Nenhuma transcrição encontrada. Faça upload de reuniões no Vault." |
| Arquivos muito grandes | Truncar para ~50.000 caracteres (limite de contexto) |
| Campos já preenchidos | Confirmar se usuário quer sobrescrever |
| Erro na API | Toast de erro, manter campos anteriores |

## Secao Tecnica

### Ordem de Implementação

1. Criar edge function `extract-project-context`
2. Atualizar `supabase/config.toml`
3. Criar hook `useExtractContext.ts`
4. Atualizar `ProjectOverviewForm.tsx` (UI + integração)
5. Atualizar `generate-strategic-plan` (usar contexto no prompt)

### Dependências

- Nenhuma nova dependência
- Reutiliza cliente Supabase para Storage
- Reutiliza padrões de edge functions existentes

### Acesso ao Storage na Edge Function

```typescript
// Baixar arquivo do Storage
const { data: fileData, error: downloadError } = await supabase
  .storage
  .from('project-files')
  .download(asset.storage_path);

if (!downloadError && fileData) {
  const text = await fileData.text();
  allContent += text + '\n\n---\n\n';
}
```

### Limite de Tokens

Para evitar exceder o contexto do modelo:
- Concatenar no máximo 50.000 caracteres
- Priorizar arquivos mais recentes (ordenar por created_at DESC)
- Pular arquivos binários (apenas .txt, .md, .csv)

