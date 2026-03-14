

## Diagnóstico: Erro ao criar projetos

### Causa raiz

A política de SELECT na tabela `projects` usa **apenas** `is_project_member(auth.uid(), id)`. Quando o projeto é criado com `.insert({...}).select().single()`, o PostgreSQL avalia o RETURNING **antes** do trigger AFTER INSERT (`handle_new_project`) que cria a linha em `project_members`.

Sequência atual:
```text
1. BEFORE INSERT → set_project_creator → created_by = auth.uid() ✓
2. INSERT → row escrita ✓ (WITH CHECK passa)
3. RETURNING → SELECT policy → is_project_member() → NÃO EXISTE MEMBRO AINDA → FALHA ✗
4. AFTER INSERT → handle_new_project → insere em project_members → TARDE DEMAIS
```

Os projetos existentes ("Empresa Teste Trigger", "Blueprintt") foram criados antes de alguma migração ter alterado a política de SELECT, ou num momento em que havia fallback para `created_by`.

### Correção

Uma migração SQL que atualiza a política de SELECT para incluir fallback no `created_by`:

```sql
DROP POLICY "Members can read their projects" ON public.projects;
CREATE POLICY "Members can read their projects"
  ON public.projects FOR SELECT
  TO public
  USING (
    is_project_member(auth.uid(), id)
    OR created_by = auth.uid()
  );
```

Isso permite que o RETURNING funcione imediatamente (pois `created_by` foi preenchido pelo trigger BEFORE INSERT), mantendo a segurança — apenas o criador ou membros veem o projeto.

### Arquivos

- 1 migração SQL (única alteração necessária)
- Nenhuma mudança no frontend

