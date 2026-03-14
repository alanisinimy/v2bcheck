

## Plano: Fase 3 — Export, Quick Notes & Project State

### Escopo

- 2 tabelas novas: `quick_notes`, `export_jobs`
- 1 storage bucket: `exports`
- 3 edge functions novas: `generate-export`, `process-quick-note`, `calculate-project-state`
- Frontend: integrar ExportPanel com a edge function real + hooks

---

### 1. SQL Migration

**Tabela `quick_notes`:**
```sql
create table quick_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null,
  content_type text not null default 'texto',
  raw_content text not null,
  processed_content text,
  pilar_sugerido text,
  status text not null default 'pendente',
  created_at timestamptz default now()
);
```

**Tabela `export_jobs`:**
```sql
create table export_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null,
  tipo text not null,
  formato text not null default 'pdf',
  status text not null default 'pendente',
  file_url text,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
```

**RLS** on both using `is_project_member(auth.uid(), project_id)` for SELECT/INSERT/UPDATE.

**Storage bucket** `exports` (private) — RLS policy for project members using path pattern `{project_id}/`.

---

### 2. Edge Function: `calculate-project-state`

No AI. Deterministic logic. Queries assets, evidences, initiatives, collaborators, processing_queue for a project. Returns:
- `current_phase`, `stepper` (5 steps with done/detail), `stats` (files, gaps, team), `cobertura` per pilar, `next_step` (action/label/route), `processing` queue status.

Essentially moves `useDashboardData` computation server-side, but both can coexist. The frontend hook can optionally call this function instead of computing locally.

---

### 3. Edge Function: `generate-export`

Receives `{ project_id, tipo, formato }`. Flow:
1. Create `export_jobs` row with status `gerando`
2. Fetch project data (gaps, initiatives, pilares_config, context)
3. For `sintese`: call Lovable AI Gateway (`google/gemini-2.5-pro`) to generate executive narrative
4. For `matriz`/`plano`: structure data as formatted text/markdown
5. Generate file content (for MVP: markdown/text — PDF generation would need a library)
6. Upload to `exports` bucket
7. Update `export_jobs` with `file_url` and status `concluido`
8. Log in `activity_log`

Note: True PDF/PPTX generation requires external libraries not available in Deno edge functions. For MVP, generate structured markdown/text files. The frontend can render these or we can note this limitation.

---

### 4. Edge Function: `process-quick-note`

Receives `{ note_id, project_id }`. Flow:
1. Fetch note from `quick_notes`
2. Call Lovable AI Gateway (`google/gemini-2.5-flash`) to structure the note and suggest pilar
3. Update `quick_notes` with `processed_content`, `pilar_sugerido`, status `processado`
4. Log in `activity_log`

---

### 5. Frontend Updates

- **ExportPanel**: Wire `handleExport` to call `generate-export` edge function via `supabase.functions.invoke()`. Add polling/state for export job status.
- **New hook `useExportJobs`**: Query `export_jobs` for project.
- **New hook `useQuickNotes`**: Query `quick_notes` for project (for future UI).
- **config.toml**: Add 3 new functions with `verify_jwt = false`.

---

### Files

**Created (5):**
1. `supabase/functions/calculate-project-state/index.ts`
2. `supabase/functions/generate-export/index.ts`
3. `supabase/functions/process-quick-note/index.ts`
4. `src/hooks/useExportJobs.ts`
5. `src/hooks/useQuickNotes.ts`

**Edited (3):**
6. `supabase/config.toml` — add 3 functions
7. `src/features/plano/components/ExportPanel.tsx` — integrate with edge function
8. SQL migration — create tables + RLS + bucket

