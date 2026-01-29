

# Gestao de Projetos - Frontend State & UI

Implementacao do sistema de gerenciamento de projetos com Context API, localStorage para persistencia, e componentes de UI para troca e criacao de projetos.

---

## 1. Project Context (Estado Global)

Criar `src/contexts/ProjectContext.tsx`:

**Estado gerenciado:**
- `currentProject: Project | null` - Projeto ativo
- `projects: Project[]` - Lista de todos os projetos
- `isLoading: boolean` - Estado de carregamento

**Funcoes expostas:**
- `setCurrentProject(project: Project)` - Troca o projeto ativo
- `addProject(project: Project)` - Adiciona novo projeto a lista e o seleciona
- `clearCurrentProject()` - Limpa selecao

**Persistencia (localStorage):**
- Salvar `lastProjectId` no localStorage ao trocar projeto
- Ao inicializar, recuperar o ID salvo e selecionar automaticamente
- Isso garante que F5 mantem o usuario no mesmo projeto

**Hook customizado:**
- `useProject()` - Retorna todo o contexto para uso nos componentes

---

## 2. Project Switcher (Dropdown na Sidebar)

Criar `src/components/layout/ProjectSwitcher.tsx`:

**Visual (Apple/Geist style):**
- Botao com nome do projeto atual + icone ChevronDown
- Fundo sutil com hover state
- Bordas arredondadas (rounded-xl)

**Dropdown (DropdownMenu do Shadcn):**
- Lista de projetos disponiveis
- Projeto atual marcado com checkmark
- Separador visual
- Botao "+ Novo Projeto" com icone Plus e cor primary

**Integracao:**
- Adicionar no topo da Sidebar (AppSidebar.tsx)
- Abaixo do logo V2 / Vendas2B

---

## 3. Modal de Criacao de Projeto

Criar `src/components/project/CreateProjectDialog.tsx`:

**Estrutura do Dialog:**
- Overlay com backdrop-blur (estetica Apple)
- Titulo: "Novo Diagnostico"
- Inputs com design limpo

**Campos do formulario:**
- Nome do Cliente/Empresa (obrigatorio)
- Setor de Atuacao (opcional)
- Data de inicio (pre-preenchida com hoje)

**Logica ao criar:**
1. Gerar ID unico (uuid ou timestamp)
2. Adicionar projeto ao contexto via `addProject()`
3. Selecionar automaticamente o novo projeto
4. Fechar modal
5. Mostrar toast de sucesso

---

## 4. Empty State (Primeiro Acesso)

Criar `src/components/layout/EmptyProjectState.tsx`:

**Quando exibir:**
- Quando `currentProject === null`
- Primeira vez do usuario ou apos limpar localStorage

**Design:**
- Ilustracao ou icone grande centralizado
- Titulo: "Bem-vindo ao Vendas2B Intelligence"
- Subtitulo: "Crie seu primeiro projeto para comecar"
- Botao CTA: "Criar Primeiro Projeto"

**Comportamento:**
- Clicar no botao abre o CreateProjectDialog

---

## 5. Refatoracao das Telas

**Dashboard.tsx:**
- Envolver com verificacao de `currentProject`
- Se null, renderiza EmptyProjectState
- Substituir `DEMO_PROJECT_ID` por `currentProject.id`
- Usar dados do projeto atual no header

**Vault.tsx:**
- Mesma logica de verificacao
- Assets filtrados por `currentProject.id`

**Matriz.tsx:**
- Mesma logica de verificacao
- Evidencias filtradas por `currentProject.id`

**App.tsx:**
- Envolver toda aplicacao com `<ProjectProvider>`

---

## 6. Dados Mock Iniciais

Para demonstracao, pre-popular com 2 projetos mock:

1. **TechCorp Brasil** - Diagnostico Comercial (projeto atual do demo)
2. **StartupXYZ** - Auditoria de Vendas

Isso permite testar a troca de projetos imediatamente.

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/contexts/ProjectContext.tsx` | Criar |
| `src/components/layout/ProjectSwitcher.tsx` | Criar |
| `src/components/project/CreateProjectDialog.tsx` | Criar |
| `src/components/layout/EmptyProjectState.tsx` | Criar |
| `src/components/layout/AppSidebar.tsx` | Modificar (adicionar ProjectSwitcher) |
| `src/App.tsx` | Modificar (adicionar ProjectProvider) |
| `src/pages/Dashboard.tsx` | Modificar (consumir contexto) |
| `src/pages/Vault.tsx` | Modificar (consumir contexto) |
| `src/pages/Matriz.tsx` | Modificar (consumir contexto) |

---

## Secao Tecnica

**Tipagem TypeScript:**
```text
interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setCurrentProject: (project: Project) => void;
  addProject: (data: CreateProjectData) => void;
  clearCurrentProject: () => void;
}

interface CreateProjectData {
  name: string;
  client_name: string;
  description?: string;
}
```

**localStorage keys:**
- `vendas2b_last_project_id` - ID do ultimo projeto selecionado
- `vendas2b_projects` - Lista de projetos (temporario ate integracao backend)

**Fluxo de inicializacao:**
1. Carregar projetos do localStorage (ou usar mocks se vazio)
2. Verificar se existe `lastProjectId` salvo
3. Se existir, selecionar projeto correspondente
4. Se nao existir, manter `currentProject = null`

