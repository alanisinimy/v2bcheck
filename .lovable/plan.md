

## Plano: Setup de Projeto — Wizard de 3 passos

### Resumo
Criar uma nova página `/projeto/novo` com um wizard de criação de projeto em 3 etapas (Dados, Pilares, Equipe), substituindo o dialog simples atual como fluxo principal de criação.

### Mudanças no banco de dados

Adicionar duas colunas à tabela `projects`:
- `sector` (text, nullable) — setor do cliente
- `company_size` (text, nullable) — tamanho da empresa

Não é necessário criar tabela para pilares customizados por enquanto — armazenar como JSON no campo existente ou em nova coluna `custom_pilares` (jsonb, nullable) na tabela `projects`.

Os convites de equipe usam a tabela `project_members` já existente. Para convites por email de usuários que ainda não existem, armazenar em uma nova tabela `project_invites` (email, role, project_id, status, created_at).

### Arquivos a criar/editar

**Novos:**
1. `src/features/projeto/components/ProjetoSetupPage.tsx` — Página principal do wizard com stepper horizontal e controle de navegação entre passos
2. `src/features/projeto/components/StepDadosProjeto.tsx` — Passo 1: inputs de nome, cliente, setor (select), tamanho (select)
3. `src/features/projeto/components/StepConfigurarPilares.tsx` — Passo 2: templates por setor com preview visual, edição inline (renomear/adicionar/remover pilares)
4. `src/features/projeto/components/StepConvidarEquipe.tsx` — Passo 3: input de email + seletor de papel (Consultor/Gestor/Visualizador) + lista de convidados
5. `src/features/projeto/components/SetupStepper.tsx` — Componente de stepper horizontal reutilizável

**Editados:**
6. `src/App.tsx` — Adicionar rota `/projeto/novo`
7. `src/shared/contexts/ProjectContext.tsx` — Expandir `addProject` para aceitar sector, company_size e custom_pilares
8. `src/shared/types/project.ts` — Adicionar campos sector, company_size, custom_pilares ao tipo Project
9. `src/shared/components/Sidebar.tsx` — Alterar botão "Novo Projeto" para navegar para `/projeto/novo` em vez de abrir dialog

### Lógica dos templates de pilares

Cada setor terá um template pré-definido com 5 pilares customizados. O componente StepConfigurarPilares mostrará os pilares do template selecionado (baseado no setor do passo 1) com capacidade de:
- Renomear cada pilar inline
- Remover pilar (mínimo 3)
- Adicionar novo pilar (máximo 7)

### Fluxo pós-criação
1. Inserir projeto na tabela `projects` com os novos campos
2. Inserir convites na tabela `project_invites`
3. Setar como projeto ativo no contexto
4. Redirecionar para `/` (Dashboard)

### Migração SQL
```sql
ALTER TABLE projects ADD COLUMN sector text;
ALTER TABLE projects ADD COLUMN company_size text;
ALTER TABLE projects ADD COLUMN custom_pilares jsonb DEFAULT NULL;

CREATE TABLE project_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read invites" ON project_invites
  FOR SELECT TO authenticated
  USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Owners/admins can manage invites" ON project_invites
  FOR ALL TO authenticated
  USING (is_project_owner_or_admin(auth.uid(), project_id));
```

