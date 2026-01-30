

# Plano: Vincular Arquivos a Colaboradores no Upload

## Resumo

Adicionar um passo no fluxo de upload do Vault que permite vincular arquivos a colaboradores existentes. Isso resolve o problema de evidências duplicadas/desconexas, pois o sistema saberá que diferentes arquivos pertencem à mesma pessoa (ex: "Formulário da Tatiane" vinculado a "Tatiane Rodrigues").

## Arquitetura da Solução

```text
+-------------------+      +-------------------+      +------------------+
| FileUploadZone    |----->| SourceTypeModal   |----->| assets table     |
| (selecionar)      |      | + CollaboratorPicker |   | collaborator_id  |
+-------------------+      +-------------------+      +------------------+
                                   |
                                   v
                           +---------------+
                           | collaborators |
                           | (dropdown)    |
                           +---------------+
```

## Fluxo de Usuario

1. Usuario arrasta arquivo no Vault
2. Modal abre: "Qual é a origem deste arquivo?"
3. Usuario seleciona "Entrevista (Time)" ou "Perfil DISC" ou "Briefing"
4. SE for um desses tipos, aparece segundo campo: "Este arquivo pertence a algum colaborador?"
   - Dropdown com colaboradores do projeto
   - Opcao "Geral (Sem vínculo)"
   - Opcao "Criar novo colaborador"
5. Usuario confirma e o arquivo é processado com o vínculo

## Mudancas no Banco de Dados

Adicionar coluna `collaborator_id` na tabela `assets`:

```sql
ALTER TABLE public.assets
ADD COLUMN collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL;
```

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| collaborator_id | UUID | ID do colaborador vinculado (nullable) |

## Tipos de Origem que Exigem Vínculo

| Source Type | Exige Colaborador? |
|-------------|-------------------|
| entrevista_operacao | Sim (Opcional) |
| briefing | Sim (Opcional) |
| perfil_disc | Sim (Recomendado) |
| entrevista_diretoria | Nao |
| reuniao_kickoff | Nao |
| reuniao_vendas | Nao |
| documentacao | Nao |

## Modificacoes nos Arquivos

### 1. Atualizar `src/lib/types.ts`

Adicionar `collaborator_id` na interface `Asset`:

```typescript
export interface Asset {
  // ... campos existentes
  collaborator_id?: string;
}
```

### 2. Atualizar `SourceTypeModal.tsx`

Modificar o modal para incluir um segundo passo quando source_type for relevante:

**Novo layout:**
```text
+------------------------------------------+
| Qual é a origem deste arquivo?           |
| arquivo.pdf                               |
+------------------------------------------+
| [x] 👥 Entrevista (Time/Operação)        |
| [ ] 📝 Briefing / Formulário             |
| [ ] 📋 Perfil DISC                       |
| [ ] ...outros                            |
+------------------------------------------+
| Este arquivo pertence a algum colaborador?|
| [Selecionar colaborador...          ▼]  |
| - Geral (Sem vínculo)                    |
| - Tatiane Rodrigues                      |
| - João Silva                             |
| - + Criar novo colaborador               |
+------------------------------------------+
|                 [Cancelar] [Processar]   |
+------------------------------------------+
```

**Logica:**
- Campo de colaborador aparece condicionalmente
- Se "Criar novo", abre sub-modal de criacao
- Opcao "Geral" = collaborator_id null

### 3. Atualizar `useUploadAsset.ts`

Adicionar campo `collaboratorId` opcional:

```typescript
interface UploadAssetData {
  projectId: string;
  file: File;
  sourceType: SourceType;
  collaboratorId?: string; // NOVO
}
```

Incluir na insercao:

```typescript
const { data: asset, error: insertError } = await supabase
  .from('assets')
  .insert({
    // ...campos existentes
    collaborator_id: collaboratorId || null, // NOVO
  })
```

### 4. Atualizar `Vault.tsx`

Modificar interfaces e handlers:

```typescript
interface PendingFile {
  file: File;
  sourceType?: SourceType;
  collaboratorId?: string; // NOVO
}
```

Passar colaboratorId no processFiles:

```typescript
const asset = await uploadAssetMutation.mutateAsync({
  projectId: currentProject.id,
  file,
  sourceType,
  collaboratorId, // NOVO
});
```

### 5. Criar `CollaboratorPicker.tsx` (Novo Componente)

Componente de selecao de colaborador reutilizavel:

```typescript
interface CollaboratorPickerProps {
  projectId: string;
  value: string | null;
  onChange: (collaboratorId: string | null) => void;
  onCreateNew?: () => void;
}
```

Features:
- Lista colaboradores do projeto via useCollaborators
- Opcao "Geral (Sem vínculo)" no topo
- Opcao "Criar novo" no final
- Styled como Select/Combobox

### 6. Atualizar `AddCollaboratorDialog.tsx`

Adicionar prop para callback apos criacao:

```typescript
interface AddCollaboratorDialogProps {
  // ...props existentes
  onCreated?: (collaborator: Collaborator) => void;
}
```

Isso permite que o modal de upload selecione automaticamente o colaborador recem-criado.

## Secao Tecnica

### Ordem de Implementacao

1. Migracao SQL (adicionar coluna collaborator_id)
2. Atualizar `src/lib/types.ts` (interface Asset)
3. Atualizar `useUploadAsset.ts` (aceitar collaboratorId)
4. Criar componente `CollaboratorPicker.tsx`
5. Atualizar `SourceTypeModal.tsx` (adicionar picker condicional)
6. Atualizar `Vault.tsx` (passar collaboratorId no fluxo)
7. Atualizar `AddCollaboratorDialog.tsx` (callback onCreated)

### Tipos que Ativam o Picker

```typescript
const SOURCE_TYPES_WITH_COLLABORATOR: SourceType[] = [
  'entrevista_operacao',
  'briefing',
  'perfil_disc',
];

const showCollaboratorPicker = selected && 
  SOURCE_TYPES_WITH_COLLABORATOR.includes(selected);
```

### Tratamento de Casos Especiais

| Cenario | Comportamento |
|---------|---------------|
| Nenhum colaborador cadastrado | Mostrar opcoes "Geral" e "Criar novo" apenas |
| Usuario cancela criacao | Manter modal de upload aberto |
| DISC com colaborador | Ao processar, atualizar o colaborador existente em vez de criar novo |
| Arquivo grande | Picker carrega enquanto arquivo processa |

### Integracao com analyze-evidences

Quando `collaboratorId` estiver presente, incluir no contexto da IA:
- Nome do colaborador nas evidencias geradas
- Evitar criar evidencias duplicadas sobre a mesma pessoa

