

# Correção da Edge Function para usar OpenAI diretamente

A Edge Function está usando o Lovable AI Gateway com modelo Gemini, mas o projeto tem a chave `OPENAI_API_KEY` configurada.

---

## Problema Atual

```text
Código atual:
├── Usa: LOVABLE_API_KEY + Lovable Gateway
├── Modelo: google/gemini-3-flash-preview
└── Resultado: Erro (chave não configurada para Gemini)

Você tem:
├── OPENAI_API_KEY ✓ (configurada)
└── LOVABLE_API_KEY (não usada)
```

---

## Solução

Reescrever `supabase/functions/analyze-evidences/index.ts` para:

1. Importar a biblioteca oficial OpenAI para Deno
2. Usar `OPENAI_API_KEY` do ambiente
3. Chamar modelo `gpt-4o`
4. Manter o mesmo System Prompt do Auditor de Vendas

---

## Mudanças Técnicas

| De (atual) | Para (novo) |
|------------|-------------|
| Lovable AI Gateway | OpenAI API direta |
| `LOVABLE_API_KEY` | `OPENAI_API_KEY` |
| `google/gemini-3-flash-preview` | `gpt-4o` |
| `fetch()` manual | SDK `OpenAI` oficial |

---

## Nova Implementação

**Import:**
```typescript
import OpenAI from 'https://deno.land/x/openai@v4.28.0/mod.ts';
```

**Cliente:**
```typescript
const openai = new OpenAI({ 
  apiKey: Deno.env.get('OPENAI_API_KEY') 
});
```

**Chamada:**
```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [...],
  tools: [...],
  tool_choice: { type: 'function', function: { name: 'extract_evidences' } }
});
```

---

## System Prompt (Mantido)

O prompt do Auditor de Vendas B2B permanece idêntico, classificando evidências nos 5 pilares.

---

## Arquivo a Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/analyze-evidences/index.ts` | Reescrever |

---

## Resultado Esperado

1. Edge Function usa `OPENAI_API_KEY` que você já configurou
2. Modelo GPT-4o processa os textos
3. Extração de evidências funciona corretamente
4. Upload no Vault dispara a análise com sucesso

