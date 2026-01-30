
# Plano: Corrigir Extração de PDF com pdf.js

## Diagnóstico

O erro identificado nos logs do console é claro:
```
Error: Invalid `workerSrc` type.
```

O pdf.js requer que `workerSrc` seja uma **string URL** apontando para o arquivo worker, mas o código atual está tentando passar um módulo ESM importado dinamicamente.

Como resultado, a função `extractTextFromFile` retorna a mensagem de erro como texto, que é enviada para a edge function `analyze-disc`. A IA recebe esse texto de erro em vez do conteúdo real do PDF e retorna `null` para todos os campos.

## Solução

Corrigir a configuração do worker do pdf.js para funcionar corretamente no Vite usando uma das duas abordagens:

### Abordagem Recomendada: Usar CDN para o Worker

A forma mais confiável é usar o worker do CDN (unpkg ou cdnjs):

```typescript
const pdfjs = await import('pdfjs-dist');
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

## Arquivos a Modificar

### 1. `src/hooks/useAnalyzeEvidences.ts`

**Seção a modificar:** Linhas 193-198 (configuração do worker)

**Mudança:**
```typescript
// ANTES (não funciona - passa módulo em vez de URL):
const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs');
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker.default || pdfjsWorker;

// DEPOIS (correto - passa URL string):
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

## Fluxo Esperado Após Correção

1. Upload de PDF DISC no Vault
2. pdf.js carrega worker do CDN corretamente
3. Texto extraído: "TATIANE RODRIGUES", "T comercial", "PERFIL EXECUTOR", "CONFORMIDADE E DOMINÂNCIA (CD)"
4. Texto enviado para edge function `analyze-disc`
5. IA interpreta e estima valores DISC baseado no perfil CD (Alto C, Alto D)
6. Colaborador cadastrado automaticamente na tabela `collaborators`

## Melhoria Adicional Sugerida

O prompt da IA também pode ser melhorado para lidar melhor com o formato do Peixe 30 que usa combinações de letras (CD, DI, IS, SC) em vez de valores numéricos. Adicionar exemplos específicos:

```
FORMATOS COMUNS:
- "Perfil CD" ou "C/D" = C e D são altos (75-85), I e S são baixos (20-30)
- "Perfil DI" = D e I são altos
- "EXECUTOR" geralmente indica Alto D + Alto C
- "COMUNICADOR" geralmente indica Alto I + Alto D
- "PLANEJADOR" geralmente indica Alto S + Alto C
- "ANALÍTICO" geralmente indica Alto C + Alto S
```
