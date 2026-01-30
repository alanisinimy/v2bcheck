
# Plano: Adicionar Tipos de Reunião "Diagnóstico" e "Planejamento" ao Vault

## Objetivo
Incluir duas novas opções de origem de arquivo no modal de upload do Vault:
- **Reunião de Diagnóstico** - Sessões de levantamento de problemas
- **Reunião de Planejamento** - Sessões de definição de ações/iniciativas

---

## Resumo das Mudanças

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/migrations/xxx_add_source_types.sql` | Criar | Adicionar novos valores ao ENUM `source_type` |
| `src/lib/types.ts` | Modificar | Adicionar novos tipos e labels com ícones |
| `src/components/vault/SourceTypeModal.tsx` | Modificar | Incluir novas opções na lista de seleção |

---

## Detalhamento Técnico

### 1. Migração do Banco de Dados

Adicionar novos valores ao ENUM existente `source_type`:

```sql
-- Adicionar novos tipos de reunião ao ENUM source_type
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'reuniao_diagnostico';
ALTER TYPE public.source_type ADD VALUE IF NOT EXISTS 'reuniao_planejamento';
```

### 2. Atualizar Types (`src/lib/types.ts`)

Adicionar os novos valores ao tipo e configuração:

```typescript
export type SourceType = 
  | 'entrevista_diretoria'
  | 'entrevista_operacao'
  | 'reuniao_kickoff'
  | 'reuniao_vendas'
  | 'reuniao_diagnostico'    // NOVO
  | 'reuniao_planejamento'   // NOVO
  | 'briefing'
  | 'documentacao'
  | 'observacao_consultor'
  | 'perfil_disc';

export const SOURCE_TYPES: Record<SourceType, { label: string; icon: string }> = {
  // ... existentes ...
  reuniao_diagnostico: { label: 'Reunião de Diagnóstico', icon: '🔍' },
  reuniao_planejamento: { label: 'Reunião de Planejamento', icon: '📋' },
};
```

### 3. Atualizar Modal de Seleção (`SourceTypeModal.tsx`)

Adicionar as novas opções na lista `sourceTypeOptions`:

```typescript
const sourceTypeOptions: SourceType[] = [
  'entrevista_diretoria',
  'entrevista_operacao',
  'reuniao_kickoff',
  'reuniao_vendas',
  'reuniao_diagnostico',    // NOVO
  'reuniao_planejamento',   // NOVO
  'briefing',
  'documentacao',
  'perfil_disc',
];
```

---

## Resultado Visual

O modal de upload exibirá as novas opções:

```text
┌─────────────────────────────────────────┐
│ 🎤  Entrevista (CEO/Diretoria)          │
│ 👥  Entrevista (Time/Operação)          │
│ 🚀  Reunião de Kick-off                 │
│ 📞  Reunião de Vendas (Gravada)         │
│ 🔍  Reunião de Diagnóstico         ← NOVO
│ 📋  Reunião de Planejamento        ← NOVO
│ 📝  Briefing / Formulário               │
│ 📄  Documentação Técnica                │
│ 📋  Perfil DISC                         │
└─────────────────────────────────────────┘
```

---

## Ordem de Execução

1. Executar migração SQL (adicionar valores ao ENUM)
2. Atualizar `src/lib/types.ts` com novos tipos e labels
3. Atualizar `SourceTypeModal.tsx` com novas opções
4. Testar upload de arquivo selecionando os novos tipos
