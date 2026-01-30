

# Correção de Cards Duplicados na Matriz de Diagnóstico

O problema é causado por **evidências duplicadas no banco de dados** - o modelo de IA está retornando insights repetidos que são inseridos sem verificação.

---

## Diagnóstico

```text
Evidência duplicada encontrada:
├── Conteúdo: "Cristian Alicke menciona que a equipe de vendas não tem um processo claro de follow-up..."
├── IDs diferentes: 40e04398-... e cd40030b-...
├── Mesmo asset_id: 9af14767-8143-467f-93f7-965d2c134678  
├── Mesmo created_at: 2026-01-30 00:21:01.167542+00
└── Causa: IA retornou a mesma evidência mais de uma vez
```

---

## Solução

### 1. Deduplicação no Hook de Análise

Modificar `src/hooks/useAnalyzeEvidences.ts` para remover duplicatas antes de inserir:

| Arquivo | Ação |
|---------|------|
| `src/hooks/useAnalyzeEvidences.ts` | Adicionar lógica de deduplicação por conteúdo |

**Lógica:**
```text
1. Recebe array de evidências da IA
2. Cria Map com chave = content normalizado
3. Extrai valores únicos do Map
4. Insere apenas as evidências únicas
```

---

### 2. Limpeza de Duplicatas Existentes (Migração SQL)

Remover duplicatas já existentes no banco de dados, mantendo apenas a primeira ocorrência:

| Arquivo | Ação |
|---------|------|
| Nova migração SQL | DELETE duplicatas mantendo 1 cópia |

**SQL:**
```text
DELETE FROM evidences 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM evidences 
  GROUP BY project_id, asset_id, content
);
```

---

## Resumo das Mudanças

| Componente | Mudança |
|------------|---------|
| `useAnalyzeEvidences.ts` | + função `deduplicateEvidences()` antes do insert |
| Migração SQL | Limpa duplicatas existentes |

---

## Resultado Esperado

1. Evidências duplicadas existentes são removidas do banco
2. Novos uploads não inserem evidências com mesmo conteúdo
3. Matriz de Diagnóstico mostra cada insight apenas uma vez

