

## Plano: Página de Configurações com aba "Equipe & Acessos"

Criar uma nova página `/settings` com duas abas (Pilares & Framework, Equipe & Acessos), seguindo o design do screenshot fornecido. A sidebar já aponta para `/settings/pilares` e `/settings/team`.

### Arquivos a criar

1. **`src/pages/Settings.tsx`** — Página principal com tabs (Pilares & Framework / Equipe & Acessos). Usa `AppLayout` e `PageHeader`. A URL `/settings/pilares` e `/settings/team` controlam a aba ativa.

2. **`src/features/settings/components/TeamAccessTab.tsx`** — Aba "Equipe & Acessos" com:
   - **Stats cards**: Membros ativos, Convites pendentes, Projetos vinculados (3 cards em grid)
   - **Convidar Membro**: Form com Email + Nome + botão "+ Enviar Convite" (verde)
   - **Membros da Equipe**: Lista de `project_members` com avatar (iniciais coloridas), nome, email, badge de role (Admin/Owner/Pendente), status de último acesso, e botões de ação (Remover, Reenviar, Cancelar)
   - **Zona de Risco**: Card vermelho com "Transferir ownership da conta"
   - Dados vêm das tabelas `project_members` e `project_invites`

3. **`src/features/settings/components/PilaresTab.tsx`** — Aba "Pilares & Framework" que reutiliza o `StepConfigurarPilares` existente para editar os pilares do projeto atual

4. **`src/features/settings/hooks/useProjectMembers.ts`** — Hook para CRUD de membros e convites (query `project_members` + `project_invites`, mutations para invite/remove/cancel)

### Arquivos a editar

5. **`src/App.tsx`** — Adicionar rotas `/settings/pilares` e `/settings/team`
6. **`src/shared/components/Sidebar.tsx`** — Ajustar paths se necessário (já apontam para as rotas corretas)

### Lógica de membros
- Membros ativos: count de `project_members` do projeto atual
- Convites pendentes: count de `project_invites` com status `pending`
- Convidar: insere em `project_invites` (email, nome, role)
- Remover: deleta de `project_members` (somente owner/admin)
- Cancelar convite: deleta de `project_invites`
- Owner não pode ser removido, mostra label "OWNER" ao invés de botão Remover
- Avatar: iniciais do nome com cores diferentes por index

### Sem migração SQL
As tabelas `project_members` e `project_invites` já existem com as RLS policies corretas.

