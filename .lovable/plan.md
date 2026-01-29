

# Corrigir Upload de Arquivos TXT no Storage

O bucket de Storage `project-files` não aceita arquivos `.txt` porque `text/plain` não está na lista de MIME types permitidos.

---

## Problema Identificado

O bucket foi criado com uma lista restrita de MIME types:
```text
audio/mpeg, audio/mp3, audio/wav
video/mp4, video/webm  
application/pdf, text/csv
Excel files
```

Arquivos `.txt` usam `text/plain` que **não está na lista**.

---

## Solução

Executar uma migration SQL para atualizar o bucket e adicionar os MIME types que faltam:

```sql
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'audio/mpeg', 
  'audio/mp3', 
  'audio/wav', 
  'audio/x-m4a',
  'video/mp4', 
  'video/webm', 
  'application/pdf', 
  'text/csv',
  'text/plain',
  'text/markdown',
  'application/vnd.ms-excel', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
WHERE name = 'project-files';
```

---

## MIME Types a Adicionar

| Extensão | MIME Type |
|----------|-----------|
| `.txt` | `text/plain` |
| `.md` | `text/markdown` |
| `.m4a` | `audio/x-m4a` |

---

## Resultado Esperado

Após a migration:
1. Upload de `.txt` funcionará
2. Upload de `.md` funcionará
3. Upload de `.m4a` funcionará
4. A IA irá analisar o conteúdo e extrair evidências

