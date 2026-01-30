

# Plano: Upload em Massa na Aba Time

## Objetivo
Permitir que usuarios facam upload de multiplos arquivos de uma vez na aba Time (PDFs DISC e CSVs de clima), seguindo o mesmo padrao de fluxo de classificacao arquivo por arquivo que ja existe no Vault.

---

## 1. Alteracoes no Componente de Upload

### `src/components/team/PeopleDataUploadZone.tsx`

**Mudancas:**
- Alterar `multiple: false` para `multiple: true` no useDropzone
- Atualizar texto para indicar suporte a multiplos arquivos
- Adicionar contador de arquivos pendentes (opcional)

```
// Antes
multiple: false,

// Depois
multiple: true,
```

**Texto atualizado:**
- "Arraste arquivos ou clique para selecionar" (plural)
- "PDFs DISC e CSVs de Pesquisa de Clima"

---

## 2. Novo Modal de Classificacao Sequencial

### `src/components/team/PeopleDataBatchModal.tsx` (Novo)

Criar modal que processa multiplos arquivos sequencialmente, similar ao `SourceTypeModal` do Vault:

**Funcionalidades:**
- Exibir progresso: "Arquivo 2 de 5"
- Para cada arquivo:
  - Nome do arquivo atual
  - Tipo detectado automaticamente (PDF = DISC, CSV = Clima)
  - Selector de colaborador (apenas para DISC)
- Botoes: "Pular", "Proximo", "Processar Todos"

**Props:**
```typescript
interface PeopleDataBatchModalProps {
  open: boolean;
  files: File[];
  collaborators: { id: string; name: string }[];
  onProcessFiles: (classifiedFiles: ClassifiedFile[]) => Promise<void>;
  onCancel: () => void;
  isProcessing: boolean;
  currentProcessingIndex: number;
}

interface ClassifiedFile {
  file: File;
  dataType: 'perfil_disc' | 'pesquisa_clima';
  collaboratorId?: string;
}
```

**UI:**
```
+------------------------------------------+
|  Classificar Arquivos (2 de 5)           |
+------------------------------------------+
|                                          |
|  [icone] colaborador_joao.pdf            |
|  Tipo detectado: PDF (Perfil DISC)       |
|                                          |
|  Vincular a colaborador:                 |
|  [Dropdown: Joao Silva        v]         |
|                                          |
|  ----------------------------------------|
|  [Pular]              [Proximo ->]       |
|                  [Processar Todos]       |
+------------------------------------------+
```

---

## 3. Atualizacao da Pagina Team

### `src/pages/Team.tsx`

**Novas States:**
```typescript
const [pendingFiles, setPendingFiles] = useState<File[]>([]);
const [currentFileIndex, setCurrentFileIndex] = useState(0);
const [classifiedFiles, setClassifiedFiles] = useState<ClassifiedFile[]>([]);
const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
const [processingProgress, setProcessingProgress] = useState(0);
```

**Atualizar `handleFilesSelected`:**
```typescript
const handleFilesSelected = useCallback((files: File[]) => {
  if (files.length === 0) return;
  
  // Multiplos arquivos: abrir modal de classificacao em lote
  setPendingFiles(files);
  setCurrentFileIndex(0);
  setClassifiedFiles([]);
  setIsBatchModalOpen(true);
}, []);
```

**Novo Handler de Processamento em Lote:**
```typescript
const handleBatchProcess = async (files: ClassifiedFile[]) => {
  setIsProcessingFile(true);
  
  for (let i = 0; i < files.length; i++) {
    setProcessingProgress(i + 1);
    const { file, dataType, collaboratorId } = files[i];
    
    // Processar cada arquivo...
    // (reutilizar logica existente)
  }
  
  setIsProcessingFile(false);
  setIsBatchModalOpen(false);
  setPendingFiles([]);
};
```

---

## 4. Indicador de Progresso

### No Modal de Classificacao
- Barra de progresso visual
- "Classificando 3 de 10 arquivos"

### Durante o Processamento
- Toast com progresso: "Processando arquivo 2 de 5..."
- Feedback de sucesso consolidado ao final

---

## Secao Tecnica

### Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/components/team/PeopleDataBatchModal.tsx` | Modal de classificacao em lote |

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/team/PeopleDataUploadZone.tsx` | Habilitar `multiple: true` |
| `src/pages/Team.tsx` | Adicionar estados e logica de processamento em lote |

### Fluxo do Usuario

```
1. Usuario arrasta 5 PDFs DISC
         |
         v
2. Modal abre: "Classificar Arquivos (1 de 5)"
         |
   +-----+-----+
   |           |
   v           v
3a. Classifica   3b. "Processar Todos"
    um por um        (auto-detecta tipo)
         |           |
         v           v
4. Processamento em paralelo com feedback
         |
         v
5. Toast: "5 colaboradores processados com sucesso"
```

### Dependencias

- Nenhuma nova dependencia
- Reutiliza componentes Dialog, Progress, Button do shadcn/ui

### Inteligencia de Deteccao Automatica

Para "Processar Todos" sem classificar um por um:
- `.pdf` -> `perfil_disc`
- `.csv` -> `pesquisa_clima`
- Sem vinculo a colaborador (criar novos automaticamente)

