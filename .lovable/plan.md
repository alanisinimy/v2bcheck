

# Melhorias no Vault e Matriz de Evidências

Duas funcionalidades serão implementadas:

---

## 1. Exclusão de Arquivos no Vault

Adicionar botão de lixeira no `AssetCard` para deletar arquivos enviados.

**Fluxo:**
- Usuário clica no ícone de lixeira
- Modal de confirmação aparece
- Ao confirmar: deleta arquivo do Storage e remove registro do banco

**Arquivos a modificar:**

| Arquivo | Ação |
|---------|------|
| `src/components/vault/AssetCard.tsx` | Adicionar botão delete + modal de confirmação |
| `src/hooks/useProject.ts` | Criar hook `useDeleteAsset` |
| `src/pages/Vault.tsx` | Passar callback de delete para AssetCard |

**Novo hook `useDeleteAsset`:**
```text
1. Remove arquivo do storage: supabase.storage.from('project-files').remove([path])
2. Deleta evidências associadas: DELETE FROM evidences WHERE asset_id = ?
3. Deleta registro do asset: DELETE FROM assets WHERE id = ?
4. Invalida queries
```

---

## 2. Toggle de Status nas Evidências

Alterar comportamento dos botões Validar/Rejeitar/Investigar para funcionar como toggle.

**Comportamento atual:**
- Clicar "Validar" sempre define status = `validado`

**Novo comportamento:**
- Clicar "Validar" quando já está `validado` → volta para `pendente`
- Clicar "Rejeitar" quando já está `rejeitado` → volta para `pendente`
- Clicar "Investigar" quando já está `investigar` → volta para `pendente`

**Arquivo a modificar:**

| Arquivo | Ação |
|---------|------|
| `src/components/matriz/EvidenceCard.tsx` | Adicionar lógica de toggle nos onClick |

**Lógica no onClick:**
```text
onClick={() => onStatusChange(
  evidence.id, 
  evidence.status === 'validado' ? 'pendente' : 'validado'
)}
```

---

## Resumo das Mudanças

| Componente | Mudança |
|------------|---------|
| `AssetCard` | + botão lixeira, + dialog confirmação, + props onDelete |
| `Vault.tsx` | + handler delete, + feedback toast |
| `useProject.ts` | + hook `useDeleteAsset` |
| `EvidenceCard` | Lógica toggle nos 3 botões de status |

---

## Resultado Esperado

1. No Vault: botão de lixeira em cada arquivo → confirma → deleta arquivo e evidências associadas
2. Na Matriz: clicar em "Validar" de novo desmarca e volta para "Pendente"

