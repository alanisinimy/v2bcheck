

# Plano: Upgrade de Inteligência do Sistema de Evidências

**Status: ✅ IMPLEMENTADO**

## Resumo

Três melhorias críticas implementadas no sistema de extração de evidências:

1. ✅ **O Cérebro**: A IA lê o contexto do colaborador (DISC, histórico) antes de analisar seus arquivos
2. ✅ **O Filtro**: Regras de exclusão para ignorar conversas sobre a consultoria Vendas2B
3. ✅ **A Faxina**: Botão para consolidar evidências duplicadas semanticamente

## Arquitetura da Solução

```text
+------------------+     +----------------------+     +-------------------+
| Vault (Upload)   |---->| analyze-evidences    |---->| evidences table   |
| collaborator_id  |     | + Contexto DISC      |     | (filtradas)       |
+------------------+     | + Blacklist Vendas2B |     +-------------------+
                         +----------------------+
                                                      
+------------------+     +----------------------+     +-------------------+
| Matriz           |---->| consolidate-evidences|---->| evidences table   |
| "Consolidar"     |     | (LLM semântico)      |     | (dedupadas)       |
+------------------+     +----------------------+     +-------------------+
```

## Parte 1: O Cérebro - Contexto do Colaborador

### Modificar `analyze-evidences/index.ts`

**Novo fluxo:**

1. Receber `collaboratorId` opcional na requisição
2. Se presente, buscar do banco:
   - Dados do colaborador (`name`, `role`, `disc_profile`)
   - Últimas 5 evidências validadas vinculadas a ele
3. Injetar contexto no System Prompt

**Novo Input:**
```json
{
  "content": "texto do arquivo",
  "collaboratorId": "uuid-opcional"
}
```

**Contexto injetado no prompt:**
```text
CONTEXTO DO COLABORADOR:
Você está analisando um arquivo de [Tatiane Rodrigues].
Cargo: [SDR]
Perfil Comportamental DISC: D=45, I=78, S=32, C=55 (Perfil Alto I - Comunicadora)

O QUE JÁ SABEMOS SOBRE ELA:
- Mencionou dificuldade com follow-up no CRM
- Reclama que metas são irreais
- Prefere ligações a emails
- Tem alta taxa de agendamento mas baixa conversão
- Resiste a usar scripts padronizados

INSTRUÇÃO ESPECIAL: 
Cruze novas informações com o perfil DISC. Se ela reclama de algo,
verifique se confirma uma característica do perfil (ex: Alto I resiste a processos rígidos).
```

### Modificar `useAnalyzeEvidences.ts`

Passar `collaboratorId` para a Edge Function:

```typescript
const { data, error } = await supabase.functions.invoke('analyze-evidences', {
  body: { content, collaboratorId }
});
```

### Modificar `Vault.tsx`

Buscar o `collaborator_id` do asset criado e passá-lo para `analyzeEvidences()`.

## Parte 2: O Filtro - Blacklist da Consultoria

### Atualizar System Prompt em `analyze-evidences`

Adicionar regras de exclusão no início:

```text
REGRAS DE EXCLUSÃO (BLACKLIST) - IGNORE COMPLETAMENTE:

1. IGNORE A CONSULTORIA:
   - Qualquer menção a "Vendas2B", "Vendas to Be", "Vendas 2 Be"
   - Frases como "Nós da consultoria vamos...", "Nosso diagnóstico vai..."
   - Promessas futuras da consultoria ("Vamos implementar", "Vamos fazer")
   - Escopo de projeto ou metodologia da consultoria

2. IGNORE OS CONSULTORES:
   - Ações atribuídas a consultores (Luana, João, Emília, ou quem conduz a reunião)
   - Perguntas dos consultores (são contexto, não evidência)
   - Explicações sobre a metodologia de trabalho

3. FOCO EXCLUSIVO NO CLIENTE:
   - Extraia APENAS fatos, dores e processos da empresa cliente (Blueprintt)
   - Se a frase fala sobre o que a consultoria vai fazer, DESCARTE
   - Se a frase fala sobre o que o CLIENTE faz/sente/sofre, EXTRAIA

EXEMPLOS DE DESCARTE:
- ❌ "A Vendas2B vai mapear todos os processos" (escopo de projeto)
- ❌ "Luana perguntou sobre o CRM" (ação do consultor)
- ❌ "Vamos entregar um dashboard personalizado" (promessa futura)

EXEMPLOS DE EXTRAÇÃO:
- ✅ "O time não preenche o CRM por falta de tempo" (dor do cliente)
- ✅ "A meta é de 30 reuniões por mês" (dado factual)
- ✅ "Usamos o HubSpot desde 2022" (tecnologia do cliente)
```

## Parte 3: A Faxina - Consolidação de Evidências

### Nova Edge Function `consolidate-evidences/index.ts`

**Input:**
```json
{
  "projectId": "uuid"
}
```

**Lógica:**

1. Buscar todas as evidências com status `pendente` ou `validado`
2. Agrupar por pilar para reduzir contexto
3. Enviar para LLM com instrução de consolidação
4. Atualizar status das redundantes para `rejeitado`
5. Retornar contagem de consolidações

**Prompt de Consolidação:**
```text
Você é um editor de evidências de diagnóstico comercial.

Analise estas evidências e identifique GRUPOS que dizem semanticamente a mesma coisa.
Para cada grupo de duplicatas:
1. Escolha a frase MAIS COMPLETA e bem escrita para representar o grupo (a "vencedora")
2. Liste os IDs das evidências redundantes que devem ser arquivadas

REGRAS:
- Duas evidências são duplicatas se comunicam o MESMO INSIGHT, mesmo com palavras diferentes
- "Time não usa CRM" e "Equipe evita preencher o sistema" são DUPLICATAS
- "Time não usa CRM" e "CRM tem poucos campos" são DIFERENTES
- Quando em dúvida, NÃO consolide

Responda em JSON:
{
  "consolidations": [
    {
      "winner_id": "uuid-da-vencedora",
      "redundant_ids": ["uuid-1", "uuid-2"],
      "reason": "Todas falam sobre baixa adoção do CRM"
    }
  ],
  "stats": {
    "total_analyzed": 50,
    "groups_found": 8,
    "evidences_archived": 22
  }
}
```

### Novo Hook `useConsolidateEvidences.ts`

```typescript
export function useConsolidateEvidences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await supabase.functions.invoke('consolidate-evidences', {
        body: { projectId }
      });
      if (error || data.error) throw new Error(data?.error || error.message);
      return data;
    },
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['evidences', projectId] });
    },
  });
}
```

### Atualizar `Matriz.tsx`

Adicionar botão "Consolidar Evidências" no header:

```text
+------------------------------------------------------------------+
| Matriz de Diagnóstico                                             |
| Mesa de trabalho do consultor...                                  |
|                                                                   |
|  [🧹 Consolidar Evidências]  [+ Nova Evidência]                  |
+------------------------------------------------------------------+
```

**Estados:**
- Normal: "🧹 Consolidar Evidências"
- Loading: "A IA está organizando a casa..." (com spinner)
- Sucesso: Toast "22 evidências consolidadas. Matriz mais limpa!"

## Secao Tecnica

### Ordem de Implementação

1. Atualizar `supabase/config.toml` (nova função)
2. Atualizar `analyze-evidences/index.ts` (blacklist + contexto)
3. Atualizar `useAnalyzeEvidences.ts` (passar collaboratorId)
4. Atualizar `Vault.tsx` (passar collaboratorId do asset)
5. Criar `consolidate-evidences/index.ts` (nova função)
6. Criar `useConsolidateEvidences.ts` (novo hook)
7. Atualizar `Matriz.tsx` (botão consolidar)

### Dependências da Edge Function

A função `analyze-evidences` precisará criar um cliente Supabase para buscar dados:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Buscar colaborador
const { data: collaborator } = await supabase
  .from('collaborators')
  .select('name, role, disc_profile')
  .eq('id', collaboratorId)
  .single();

// Buscar evidências anteriores
const { data: previousEvidences } = await supabase
  .from('evidences')
  .select('content')
  .eq('project_id', projectId)
  .eq('status', 'validado')
  // Filtrar por colaborador quando tivermos asset_id
  .order('created_at', { ascending: false })
  .limit(5);
```

### Limite de Tokens na Consolidação

Para projetos com muitas evidências:
- Processar em lotes de 50 evidências
- Agrupar por pilar antes de enviar ao LLM
- Usar gpt-4o-mini para custo/eficiência

### Tratamento de Erros

| Cenário | Comportamento |
|---------|---------------|
| Colaborador não encontrado | Processar sem contexto (fallback) |
| Nenhuma evidência anterior | Omitir seção "O que já sabemos" |
| Menos de 5 evidências para consolidar | Toast: "Poucas evidências para consolidar" |
| Erro na API | Toast de erro, manter estado anterior |

### Fluxo de Dados Atualizado

```text
1. Upload no Vault
   └── collaborator_id salvo em assets
   
2. analyze-evidences
   ├── Recebe collaboratorId
   ├── Busca contexto (DISC + histórico)
   ├── Aplica blacklist Vendas2B
   └── Extrai evidências filtradas

3. Matriz
   ├── Exibe evidências
   └── Botão "Consolidar"
       ├── Chama consolidate-evidences
       ├── LLM agrupa duplicatas
       └── Atualiza status para rejeitado
```

