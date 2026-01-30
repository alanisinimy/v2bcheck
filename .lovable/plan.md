

# Plano: Vincular Projetos Existentes ao Usuário

## Problema Identificado

| Tabela | Dados |
|--------|-------|
| `projects` | 1 projeto: "Blueprintt" (id: `9094daab-712b-4d68-ac2b-fd6a3d3ae39f`) |
| `project_members` | **VAZIA** - nenhum usuário vinculado |
| Seu user_id | `dcb5b62e-fd3f-4020-a7f1-039333520f05` |

O trigger `on_project_created` só funciona para **novos projetos**. Projetos criados antes da migração de autenticação não têm membros associados.

## Solução

Executar uma migração SQL para vincular você como "owner" do projeto existente.

## Detalhes Técnicos

### Migração SQL

```sql
-- Vincular usuário existente ao projeto existente como owner
INSERT INTO public.project_members (project_id, user_id, role)
VALUES (
  '9094daab-712b-4d68-ac2b-fd6a3d3ae39f', -- Projeto Blueprintt
  'dcb5b62e-fd3f-4020-a7f1-039333520f05', -- Seu user_id
  'owner'
)
ON CONFLICT (project_id, user_id) DO NOTHING;
```

### Verificação Pós-Migração

Após a migração, você poderá:
- Ver o projeto "Blueprintt" no Dashboard
- Acessar todas as evidências, colaboradores e assets vinculados
- Criar novos projetos (que serão automaticamente vinculados)

## Arquivos a Modificar

| Tipo | Descrição |
|------|-----------|
| Migração SQL | Inserir registro em `project_members` |

## Resultado Esperado

```text
ANTES:
project_members = []
Dashboard = "Nenhum projeto encontrado"

DEPOIS:
project_members = [{ project: Blueprintt, user: você, role: owner }]
Dashboard = Mostra projeto Blueprintt com todos os dados
```

