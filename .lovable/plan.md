

# Implementação do Agente de Extração de Evidências com IA

Criação da Edge Function `analyze-evidences` que usa IA para extrair evidências estruturadas de textos e integração com o Vault para processamento automático de arquivos.

---

## Visão Geral da Arquitetura

```text
┌─────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│   Vault.tsx     │ ──── │  analyze-evidences   │ ──── │  Lovable AI     │
│   (Frontend)    │      │  (Edge Function)     │      │  Gateway        │
└─────────────────┘      └──────────────────────┘      └─────────────────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────┐      ┌──────────────────────┐
│  assets table   │      │  evidences table     │
│  (status upd.)  │      │  (insert batch)      │
└─────────────────┘      └──────────────────────┘
```

---

## 1. Edge Function: analyze-evidences

Criar `supabase/functions/analyze-evidences/index.ts`:

**Configuração:**
- Usar Lovable AI Gateway (já configurado com `LOVABLE_API_KEY`)
- Modelo: `google/gemini-3-flash-preview` (rápido e eficiente para extração)
- Temperature: 0.2 (respostas determinísticas)
- Tool calling para garantir JSON estruturado

**System Prompt (O Cérebro do Auditor):**
```text
Você é um Auditor Sênior de Vendas B2B. Sua função é extrair evidências 
factuais de textos para um diagnóstico comercial.

Analise o texto e extraia itens classificando-os em 5 Pilares:
1. Pessoas (Perfil, Skills, Motivação)
2. Processos (Fluxo, Gargalos, Cadência)
3. Dados (KPIs, Metas, Conversão)
4. Tecnologia (CRM, Ferramentas)
5. Gestão & Cultura (Rituais, Crenças)

REGRAS:
- Seja factual e direto
- Se houver contradição explícita, marque is_divergence=true
- Classifique cada evidência corretamente no pilar apropriado
```

**Schema de Resposta (via Tool Calling):**
```text
{
  "evidences": [
    {
      "content": "Descrição clara do fato",
      "pilar": "pessoas" | "processos" | "dados" | "tecnologia" | "gestao",
      "is_divergence": boolean,
      "divergence_description": "Explicação se for divergência"
    }
  ]
}
```

**Tratamento de Erros:**
- Validação de JSON inválido
- Rate limiting (429) e payment required (402)
- CORS headers completos
- Logging detalhado para debug

---

## 2. Atualizar config.toml

Adicionar configuração da Edge Function:

```toml
[functions.analyze-evidences]
verify_jwt = false
```

---

## 3. Hook: useAnalyzeEvidences

Criar `src/hooks/useAnalyzeEvidences.ts`:

**Responsabilidades:**
- Chamar `supabase.functions.invoke('analyze-evidences')`
- Processar resposta e inserir evidências no banco em batch
- Vincular ao `project_id` e `asset_id` atuais
- Retornar contagem de evidências criadas

**Interface:**
```text
useAnalyzeEvidences({
  projectId: string,
  assetId: string,
  content: string,
  sourceDescription: string
}) => Promise<{ count: number }>
```

---

## 4. Integração no Vault.tsx

**Fluxo Atualizado de Upload:**

1. Upload do arquivo para Storage ✓ (já existe)
2. Criar registro na tabela assets ✓ (já existe)
3. **NOVO:** Extrair texto do arquivo
   - Arquivos `.txt`, `.csv`: ler conteúdo diretamente
   - Arquivos de áudio/PDF: usar placeholder simulado (próxima iteração)
4. **NOVO:** Chamar Edge Function `analyze-evidences`
5. **NOVO:** Inserir evidências extraídas no banco
6. Atualizar status do asset para `completed`
7. Mostrar toast com contagem de evidências

**UI Updates:**
- Mostrar progresso: "Analisando com IA..."
- Toast de sucesso: "IA extraiu X evidências do arquivo"
- Se erro, status do asset vai para `error`

---

## 5. Helper: Extração de Texto

Criar função `extractTextFromFile(file: File)`:

**Suporte inicial:**
- `.txt`: `file.text()`
- `.csv`: `file.text()` (IA interpreta tabelas)
- `.md`: `file.text()`

**Placeholder para futuro:**
- Áudio (`.mp3`, `.wav`): texto simulado de reunião
- PDF: texto simulado de documento
- Nota: Whisper e OCR serão implementados na próxima iteração

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/analyze-evidences/index.ts` | Criar |
| `supabase/config.toml` | Modificar |
| `src/hooks/useAnalyzeEvidences.ts` | Criar |
| `src/pages/Vault.tsx` | Modificar |

---

## Seção Técnica

**Mapeamento de Pilares (IA → DB):**
```text
"Pessoas"           → "pessoas"
"Processos"         → "processos"
"Dados"             → "dados"
"Tecnologia"        → "tecnologia"
"Gestão & Cultura"  → "gestao"
```

**Rate Limiting:**
- Edge Function lida com 429 e 402 do Lovable AI
- Frontend mostra erro apropriado ao usuário

**Vantagem de usar Lovable AI:**
- `LOVABLE_API_KEY` já está configurado automaticamente
- Não precisa de chave OpenAI adicional
- Modelo `google/gemini-3-flash-preview` é rápido e preciso

**Teste de Validação:**
1. Fazer upload de arquivo `.txt` com conteúdo de reunião
2. Verificar se evidências aparecem na Matriz
3. Dar F5 e confirmar persistência

