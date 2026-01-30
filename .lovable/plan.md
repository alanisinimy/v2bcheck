

# Plano: Reforçar Filtro Anti-Consultoria

## Problema Identificado

A IA ainda extrai evidências sobre o trabalho da Vendas to Be/V2B porque:

1. LLMs respondem melhor a instruções **positivas** do que listas de exclusão
2. Não há **validação pós-extração** para capturar evidências que escapam
3. Variações de nome ("Vendas to Be" vs "Vendas2B") podem confundir

## Solução em 3 Camadas

```text
CAMADA 1: PROMPT REFORÇADO
+----------------------------------+
| "ANTES de extrair, pergunte:    |
|  Esta frase é sobre o CLIENTE?" |
+----------------------------------+
           ↓
CAMADA 2: VALIDAÇÃO NO TOOL CALL
+----------------------------------+
| Campo obrigatório:               |
| is_about_client: boolean         |
| (IA deve marcar explicitamente) |
+----------------------------------+
           ↓
CAMADA 3: FILTRO PÓS-EXTRAÇÃO
+----------------------------------+
| Regex/keywords no backend para  |
| capturar evidências que escapam |
+----------------------------------+
```

## Mudanças Técnicas

### 1. Reformular o Prompt (Abordagem Positiva)

Em vez de uma lista de "não faça", usar perguntas de validação:

**Antes (Negativo):**
```text
IGNORE A CONSULTORIA:
- Qualquer menção a "Vendas2B"...
```

**Depois (Positivo + Validação):**
```text
TESTE DE RELEVÂNCIA (aplique a CADA frase antes de extrair):

Pergunta 1: "Esta informação descreve algo que o CLIENTE faz, sente ou possui?"
- SIM → Pode ser evidência
- NÃO → DESCARTE

Pergunta 2: "Esta frase menciona trabalho FUTURO da consultoria?"
- SIM → DESCARTE (escopo de projeto, não evidência)
- NÃO → Continue

Pergunta 3: "O sujeito da frase é um consultor externo (Luana, João, Emília, Vendas2B)?"
- SIM → DESCARTE
- NÃO → EXTRAIA
```

### 2. Adicionar Campo de Validação no Tool Call

Forçar a IA a declarar explicitamente se é sobre o cliente:

```typescript
properties: {
  content: { type: 'string' },
  pilar: { type: 'string', enum: [...] },
  is_about_client: { 
    type: 'boolean',
    description: 'TRUE se a evidência é sobre o cliente. FALSE se menciona a consultoria/escopo futuro.'
  },
  // ... outros campos
}
```

### 3. Filtro Pós-Extração no Backend

Adicionar validação depois que a IA retorna:

```typescript
// Palavras-chave que indicam evidência sobre consultoria
const CONSULTANCY_KEYWORDS = [
  'vendas2b', 'vendas to be', 'vendas 2 be', 'v2b',
  'a gente vai', 'vamos fazer', 'vamos entregar',
  'nosso diagnóstico', 'nossa metodologia',
  'a consultoria', 'nós vamos'
];

// Nomes de consultores conhecidos
const CONSULTANT_NAMES = ['luana', 'emília', 'emilia'];

function isAboutConsultancy(content: string): boolean {
  const lower = content.toLowerCase();
  
  // Check keywords
  for (const keyword of CONSULTANCY_KEYWORDS) {
    if (lower.includes(keyword)) return true;
  }
  
  // Check if starts with consultant action
  for (const name of CONSULTANT_NAMES) {
    if (lower.startsWith(name) || lower.includes(`${name} vai`)) return true;
  }
  
  return false;
}

// Filtrar evidências após extração
const filteredEvidences = evidences.filter(ev => 
  ev.is_about_client !== false && !isAboutConsultancy(ev.content)
);
```

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/analyze-evidences/index.ts` | Reformular prompt + adicionar filtro pós-extração |

## Novo System Prompt Completo

```text
Você é um Auditor Sênior de Vendas B2B extraindo evidências para diagnóstico comercial.

═══════════════════════════════════════════════════════════════
                    TESTE DE RELEVÂNCIA OBRIGATÓRIO
═══════════════════════════════════════════════════════════════

ANTES de extrair qualquer evidência, aplique este teste a CADA frase:

┌─────────────────────────────────────────────────────────────┐
│ PERGUNTA 1: O sujeito da frase é o CLIENTE?                │
│ - "O time de vendas não usa CRM" → SIM (cliente)           │
│ - "A Vendas2B vai mapear processos" → NÃO (consultoria)    │
│                                                             │
│ Se NÃO → DESCARTE IMEDIATAMENTE                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PERGUNTA 2: A frase descreve um FATO ATUAL ou uma          │
│             PROMESSA FUTURA?                                │
│ - "Usamos HubSpot desde 2022" → FATO ATUAL ✓               │
│ - "Vamos implementar dashboards" → PROMESSA FUTURA ✗       │
│                                                             │
│ Se PROMESSA FUTURA → DESCARTE                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PERGUNTA 3: A frase é sobre metodologia/escopo de projeto? │
│ - "Nossa metodologia tem 5 pilares" → SIM (escopo) ✗       │
│ - "O processo de vendas demora 45 dias" → NÃO (cliente) ✓  │
│                                                             │
│ Se SIM → DESCARTE                                          │
└─────────────────────────────────────────────────────────────┘

TERMOS QUE INDICAM DESCARTE AUTOMÁTICO:
- "Vendas2B", "Vendas to Be", "V2B", "a consultoria"
- "Luana vai...", "João vai...", "Emília vai..."
- "A gente vai...", "Nós vamos...", "Vamos entregar..."
- "Nosso diagnóstico", "Nossa metodologia", "Nosso projeto"

═══════════════════════════════════════════════════════════════

PILARES DE CLASSIFICAÇÃO:
1. Pessoas - Perfil, Skills, Motivação, Comportamento
2. Processos - Fluxo, Gargalos, Cadência, SLA
3. Dados - KPIs, Metas, Conversão, Métricas
4. Tecnologia - CRM, Ferramentas, Stack, Automação
5. Gestão & Cultura - Rituais, Crenças, Alinhamento

REGRAS:
- Extraia APENAS evidências que passam no teste de relevância
- Seja factual e direto
- Prefira frases completas e contextualizadas
- Marque is_divergence=true se houver contradição explícita
- Marque is_about_client=false se tiver QUALQUER dúvida
```

## Fluxo de Filtragem

```text
Texto de entrada (transcrição de reunião)
         ↓
    [PROMPT REFORÇADO]
    "Aplique o teste de relevância"
         ↓
    [TOOL CALL COM VALIDAÇÃO]
    is_about_client: true/false
         ↓
    [FILTRO PÓS-EXTRAÇÃO]
    Regex para keywords da consultoria
         ↓
    Evidências limpas salvas no banco
```

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| "Luana menciona que a equipe da Vendas to Be irá realizar um diagnóstico" | **DESCARTADA** (filtro pós-extração) |
| "O time não preenche o CRM por falta de tempo" | **MANTIDA** ✓ |
| "Vamos entregar um dashboard personalizado" | **DESCARTADA** (prompt + filtro) |
| "A meta de conversão é 25%" | **MANTIDA** ✓ |

