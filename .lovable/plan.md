
# Classificação de Tipo de Fonte no The Vault

Nova funcionalidade para classificar a origem dos arquivos enviados, contextualizando a análise de evidências.

---

## Visão Geral

| Etapa | Descrição |
|-------|-----------|
| 1 | Modal de seleção obrigatória ao arrastar/selecionar arquivo |
| 2 | Persistência do tipo de fonte na tabela `assets` |
| 3 | Exibição da tag de origem nos cards de evidência na Matriz |

---

## 1. Schema do Banco de Dados

Adicionar nova coluna na tabela `assets`:

| Coluna | Tipo | Default |
|--------|------|---------|
| `source_type` | TEXT (ou ENUM) | NULL |

**Valores possíveis (ENUM recomendado):**
```text
entrevista_diretoria   → "Entrevista (CEO/Diretoria)"
entrevista_operacao    → "Entrevista (Time/Operacao)"  
reuniao_kickoff        → "Reuniao de Kick-off"
reuniao_vendas         → "Reuniao de Vendas (Gravada)"
briefing               → "Briefing / Formulario Respondido"
documentacao           → "Documentacao Tecnica (Processos/Playbook)"
```

---

## 2. Novo Componente: Modal de Classificacao

Criar `src/components/vault/SourceTypeModal.tsx`:

```text
Dialog com:
├── Titulo: "Qual e a origem deste arquivo?"
├── Subtitulo: nome do arquivo sendo classificado
├── 6 opcoes de radio com icones:
│   ├── Entrevista (CEO/Diretoria)
│   ├── Entrevista (Time/Operacao)
│   ├── Reuniao de Kick-off
│   ├── Reuniao de Vendas (Gravada)
│   ├── Briefing / Formulario Respondido
│   └── Documentacao Tecnica
└── Botao "Processar Arquivo" (disabled ate selecionar)
```

---

## 3. Fluxo de Upload Atualizado

**Vault.tsx - Novo fluxo:**

```text
1. Usuario arrasta/seleciona arquivos
2. Para CADA arquivo:
   a. Abre modal de classificacao
   b. Usuario seleciona source_type
   c. Fecha modal
   d. Inicia upload com source_type
3. Continua processamento normal (IA, etc)
```

**Implementacao:**
- Estado para armazenar arquivos pendentes: `pendingFiles: File[]`
- Estado para arquivo atual sendo classificado: `currentFileIndex: number`
- Estado para source_type selecionado: `selectedSourceType: SourceType`
- Modal controlado: `isModalOpen: boolean`

---

## 4. Atualizacao do Hook de Upload

**useUploadAsset.ts:**

```text
interface UploadAssetData {
  projectId: string;
  file: File;
  sourceType: SourceType;  // NOVO
}

// Insert agora inclui:
.insert({
  ...
  source_type: sourceType,
})
```

---

## 5. Propagacao para Evidencias

**useAnalyzeEvidences.ts:**

Atualizar `source_description` para incluir o tipo de fonte:

```text
Antes:  "Arquivo: reuniao.mp3"
Depois: "Entrevista (CEO/Diretoria) • reuniao.mp3"
```

**Novo parametro:**
```text
interface AnalyzeEvidencesParams {
  ...
  sourceType: SourceType;  // NOVO
}
```

---

## 6. Exibicao na Matriz

**EvidenceCard.tsx:**

Atualizar secao de source para exibir tag formatada:

```text
Antes:
└── "Arquivo: christian.mp3"

Depois:
└── Badge com icone + tipo de fonte + nome do arquivo
    Exemplo: "Entrevista (Diretoria) • christian.mp3"
```

Layout proposto:
```text
┌─────────────────────────────────────┐
│ Pessoas │ Divergência               │
├─────────────────────────────────────┤
│ Evidência: O time de vendas...      │
├─────────────────────────────────────┤
│ Entrevista (CEO/Diretoria) • arq.mp3│
├─────────────────────────────────────┤
│ [Validar] [Rejeitar] [Investigar]   │
└─────────────────────────────────────┘
```

---

## 7. Tipos TypeScript

**src/lib/types.ts:**

```text
// Novo tipo
export type SourceType = 
  | 'entrevista_diretoria'
  | 'entrevista_operacao'
  | 'reuniao_kickoff'
  | 'reuniao_vendas'
  | 'briefing'
  | 'documentacao';

// Configuracao de exibicao
export const SOURCE_TYPES: Record<SourceType, { label: string; icon: string }> = {
  entrevista_diretoria: { label: 'Entrevista (CEO/Diretoria)', icon: '🎤' },
  entrevista_operacao: { label: 'Entrevista (Time/Operacao)', icon: '👥' },
  reuniao_kickoff: { label: 'Reuniao de Kick-off', icon: '🚀' },
  reuniao_vendas: { label: 'Reuniao de Vendas (Gravada)', icon: '📞' },
  briefing: { label: 'Briefing / Formulario', icon: '📝' },
  documentacao: { label: 'Documentacao Tecnica', icon: '📄' },
};

// Atualizar interface Asset
export interface Asset {
  ...
  source_type?: SourceType;
}
```

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| **Migracao SQL** | Criar ENUM e adicionar coluna `source_type` |
| `src/lib/types.ts` | Adicionar tipo `SourceType` e config |
| `src/components/vault/SourceTypeModal.tsx` | **NOVO** - Modal de classificacao |
| `src/pages/Vault.tsx` | Integrar modal no fluxo de upload |
| `src/hooks/useUploadAsset.ts` | Aceitar `sourceType` no upload |
| `src/hooks/useAnalyzeEvidences.ts` | Formatar `source_description` com tipo |
| `src/components/vault/AssetCard.tsx` | Exibir badge do tipo de fonte |
| `src/components/matriz/EvidenceCard.tsx` | Formatar exibicao com icone + tipo |

---

## Resultado Esperado

1. **Vault**: Ao arrastar arquivo, modal aparece pedindo classificacao
2. **Vault**: AssetCard mostra badge do tipo de fonte
3. **Matriz**: Cards mostram origem contextualizada (ex: "Entrevista (Diretoria) • christian.mp3")
4. **Contexto**: Consultor sabe se evidencia veio de gestor, time ou documento
