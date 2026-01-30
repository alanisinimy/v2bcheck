import { supabase } from '@/integrations/supabase/client';
import type { Pilar, SourceType } from '@/lib/types';
import { SOURCE_TYPES } from '@/lib/types';

interface AnalyzeEvidencesParams {
  projectId: string;
  assetId: string;
  content: string;
  sourceDescription: string;
  sourceType: SourceType;
}

interface ExtractedEvidence {
  content: string;
  pilar: Pilar;
  is_divergence: boolean;
  divergence_description?: string;
}

interface AnalyzeResult {
  count: number;
  error?: string;
}

// Deduplicate evidences by normalized content
function deduplicateEvidences(evidences: ExtractedEvidence[]): ExtractedEvidence[] {
  const seen = new Map<string, ExtractedEvidence>();
  
  for (const evidence of evidences) {
    // Normalize: trim, lowercase, collapse whitespace
    const normalizedContent = evidence.content
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    
    // Keep only the first occurrence
    if (!seen.has(normalizedContent)) {
      seen.set(normalizedContent, evidence);
    }
  }
  
  return Array.from(seen.values());
}

export async function analyzeEvidences({
  projectId,
  assetId,
  content,
  sourceDescription,
  sourceType,
}: AnalyzeEvidencesParams): Promise<AnalyzeResult> {
  try {
    // Format source description with source type
    const sourceConfig = SOURCE_TYPES[sourceType];
    const formattedSource = `${sourceConfig.icon} ${sourceConfig.label} • ${sourceDescription}`;
    // Call the Edge Function
    const { data, error: functionError } = await supabase.functions.invoke('analyze-evidences', {
      body: { content }
    });

    if (functionError) {
      console.error('Edge function error:', functionError);
      throw new Error(functionError.message || 'Failed to analyze content');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    const evidences: ExtractedEvidence[] = data.evidences;

    if (!evidences || evidences.length === 0) {
      return { count: 0 };
    }

    // Deduplicate evidences before inserting
    const uniqueEvidences = deduplicateEvidences(evidences);
    
    console.log(`Deduplication: ${evidences.length} → ${uniqueEvidences.length} evidences`);

    if (uniqueEvidences.length === 0) {
      return { count: 0 };
    }

    // Batch insert unique evidences into the database
    const evidencesToInsert = uniqueEvidences.map((ev) => ({
      project_id: projectId,
      asset_id: assetId,
      pilar: ev.pilar,
      content: ev.content,
      source_description: formattedSource,
      status: 'pendente' as const,
      is_divergence: ev.is_divergence || false,
      divergence_description: ev.divergence_description || null,
    }));

    const { error: insertError } = await supabase
      .from('evidences')
      .insert(evidencesToInsert);

    if (insertError) {
      console.error('Failed to insert evidences:', insertError);
      throw new Error('Failed to save evidences to database');
    }

    return { count: uniqueEvidences.length };
  } catch (error) {
    console.error('analyzeEvidences error:', error);
    return { 
      count: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Helper function to extract text from files
export async function extractTextFromFile(file: File): Promise<string | null> {
  const fileName = file.name.toLowerCase();
  
  // Text-based files: read directly
  if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
    return await file.text();
  }
  
  // Audio files: placeholder for future Whisper integration
  if (fileName.endsWith('.mp3') || fileName.endsWith('.wav') || fileName.endsWith('.m4a')) {
    return `[Transcrição de áudio - ${file.name}]
    
Esta é uma reunião de diagnóstico comercial simulada.
O gestor mencionou que a equipe usa o CRM Salesforce mas não está satisfeito com os dashboards.
A meta de conversão é de 25% mas atualmente estão em 18%.
Há um vendedor sênior que resiste às novas metodologias propostas.
O processo de follow-up não está documentado e cada vendedor faz de um jeito.
A cultura da empresa valoriza resultados individuais sobre trabalho em equipe.

[Nota: Implementar Whisper API na próxima iteração]`;
  }
  
  // PDF files: placeholder for future OCR integration
  if (fileName.endsWith('.pdf')) {
    return `[Documento PDF - ${file.name}]
    
Relatório de Performance Comercial Q4.
Taxa de conversão: 22% (meta: 25%).
Principais gargalos identificados: tempo de resposta ao lead > 48h.
Stack tecnológica: Salesforce CRM + Planilhas Excel para forecast.
Reuniões de pipeline: semanais, mas sem ata formal.

[Nota: Implementar OCR na próxima iteração]`;
  }
  
  // Unsupported file type
  return null;
}
