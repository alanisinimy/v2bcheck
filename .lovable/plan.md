
# Plano de Implementacao: 3 Itens Pendentes do Plano Mestre V2.0

## Resumo Executivo

Este plano detalha a implementacao de tres funcionalidades pendentes:
1. **Nota Tecnica no Vault** - Modal Rich Text para analises manuais do consultor
2. **Upload de Dados de Pessoas na aba Time** - Botao dedicado para PDFs DISC e CSVs de clima
3. **Edge Function `analyze-people-data`** - Processamento separado para dados de pessoas

---

## 1. Nota Tecnica no Vault

### Objetivo
Permitir que consultores insiram analises manuais em Rich Text (ex: observacoes sobre planilhas, processos ou gaps identificados em campo) que serao processadas pela IA como fonte de alta confianca.

### Alteracoes Necessarias

**Novo Componente: `src/components/vault/TechnicalNoteModal.tsx`**
- Modal com Dialog do Shadcn/UI
- Textarea para conteudo da nota (Rich Text simplificado com Textarea)
- Campo opcional para titulo/assunto
- Botao "Enviar para Analise"
- Indicador de processamento

**Atualizacao: `src/pages/Vault.tsx`**
- Adicionar botao "Adicionar Nota Tecnica" no header ao lado do upload zone
- State para controlar abertura do modal de nota tecnica
- Handler para processar a nota tecnica:
  - Criar asset virtual com `source_type: 'observacao_consultor'`
  - Chamar `analyzeEvidences` com flag especial

**Atualizacao: `src/hooks/useAnalyzeEvidences.ts`**
- Adicionar funcao `analyzeTechnicalNote` para criar asset e processar nota
- Passar `sourceType` corretamente para a Edge Function

**Atualizacao: `supabase/functions/analyze-evidences/index.ts`**
- Detectar quando `sourceType === 'observacao_consultor'`
- Adicionar instrucao no prompt: "Esta e uma Nota Tecnica do Consultor. Trate como VERDADE ABSOLUTA com alta confianca."

---

## 2. Upload de Dados de Pessoas na Aba Time

### Objetivo
Criar trilha separada de upload na aba Time para arquivos relacionados a pessoas (PDFs DISC, CSVs de clima organizacional) que NAO geram gaps na Matriz, apenas atualizam perfis de colaboradores.

### Alteracoes Necessarias

**Novo Componente: `src/components/team/PeopleDataUploadZone.tsx`**
- Zona de upload simplificada (similar ao FileUploadZone do Vault)
- Aceita apenas: PDF, CSV
- Texto explicativo: "Upload de PDFs DISC ou pesquisas de clima"

**Novo Componente: `src/components/team/PeopleDataTypeModal.tsx`**
- Modal para classificar o tipo do arquivo:
  - `perfil_disc` - PDF de perfil DISC individual
  - `pesquisa_clima` - CSV de pesquisa de clima organizacional
- Campo opcional para vincular a colaborador existente

**Atualizacao: `src/pages/Team.tsx`**
- Adicionar botao "Upload Dados de Pessoas" no header
- Estado para controlar modais de upload
- Handler para processar arquivos:
  - PDFs DISC: chamar `analyze-disc` (ja existe)
  - CSVs de clima: chamar nova function `analyze-people-data`

**Atualizacao: `src/lib/types.ts`**
- Adicionar tipo `pesquisa_clima` ao enum `SourceType`
- Adicionar configuracao no `SOURCE_TYPES`

---

## 3. Edge Function `analyze-people-data`

### Objetivo
Processar arquivos de dados de pessoas (CSVs de clima, etc) e atualizar perfis de colaboradores SEM gerar evidencias/gaps na Matriz.

### Nova Edge Function: `supabase/functions/analyze-people-data/index.ts`

**Responsabilidades:**
- Receber conteudo do arquivo e tipo (clima, etc)
- Processar CSV de clima organizacional:
  - Identificar colaboradores mencionados
  - Extrair metricas de engajamento/satisfacao
  - Atualizar metadados no perfil do colaborador
- Retornar lista de colaboradores atualizados

**Estrutura:**
```typescript
// Inputs
{
  projectId: string;
  assetId: string;
  content: string;
  dataType: 'pesquisa_clima' | 'feedback_360';
}

// Output
{
  collaboratorsUpdated: number;
  newCollaborators: number;
  insights: string[];
}
```

**Prompt de IA para Pesquisa de Clima:**
- Extrair nomes de colaboradores do CSV
- Identificar metricas de satisfacao/engajamento
- Cruzar com colaboradores existentes no projeto
- Gerar insights sobre cultura do time

**Atualizacao: `supabase/config.toml`**
- Adicionar configuracao para nova function

---

## Diagrama de Fluxo

```text
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
|   VAULT          |     |   TEAM            |     |   MATRIZ         |
|                  |     |                   |     |                  |
+--------+---------+     +---------+---------+     +--------+---------+
         |                         |                        ^
         v                         v                        |
+--------+---------+     +---------+---------+              |
| Upload Arquivos  |     | Upload Pessoas    |              |
| + Nota Tecnica   |     | (DISC, Clima)     |              |
+--------+---------+     +---------+---------+              |
         |                         |                        |
         v                         v                        |
+--------+---------+     +---------+---------+              |
| analyze-         |     | analyze-disc      |              |
| evidences        |     | analyze-people-   |              |
|                  |     | data              |              |
+--------+---------+     +---------+---------+              |
         |                         |                        |
         v                         v                        |
+--------+---------+     +---------+---------+              |
| GAPS na Matriz   |     | Perfis de         |              |
| (evidences)      |     | Colaboradores     +--------------+
+------------------+     +-------------------+  (Nao gera gaps)
```

---

## Secao Tecnica

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/vault/TechnicalNoteModal.tsx` | Modal para nota tecnica |
| `src/components/team/PeopleDataUploadZone.tsx` | Zona de upload para Team |
| `src/components/team/PeopleDataTypeModal.tsx` | Modal de classificacao |
| `supabase/functions/analyze-people-data/index.ts` | Edge function nova |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Vault.tsx` | Adicionar botao e modal de Nota Tecnica |
| `src/pages/Team.tsx` | Adicionar zona de upload e processamento |
| `src/lib/types.ts` | Adicionar `pesquisa_clima` ao SourceType |
| `src/hooks/useAnalyzeEvidences.ts` | Adicionar handler para nota tecnica |
| `supabase/functions/analyze-evidences/index.ts` | Detectar notas tecnicas com alta confianca |
| `supabase/config.toml` | Registrar nova edge function |

### Migracao de Banco (Se Necessario)

Verificar se o enum `source_type` ja inclui `pesquisa_clima`. Se nao:
```sql
ALTER TYPE source_type ADD VALUE 'pesquisa_clima';
```

### Dependencias
- Nenhuma nova dependencia necessaria
- Reutiliza componentes existentes (Dialog, Button, FileUploadZone pattern)

### Estimativa de Implementacao
- **Nota Tecnica**: 2 arquivos novos, 3 modificacoes
- **Upload Team**: 2 arquivos novos, 2 modificacoes
- **Edge Function**: 1 arquivo novo, 1 modificacao (config)

**Total**: 5 novos arquivos + 6 modificacoes
