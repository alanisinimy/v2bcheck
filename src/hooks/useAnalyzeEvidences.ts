import { supabase } from '@/integrations/supabase/client';
import type { Pilar, SourceType } from '@/lib/types';
import { SOURCE_TYPES } from '@/lib/types';

interface AnalyzeEvidencesParams {
  projectId: string;
  assetId: string;
  content: string;
  sourceDescription: string;
  sourceType: SourceType;
  collaboratorId?: string;
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
  collaborator?: {
    id: string;
    name: string;
  };
  isNewCollaborator?: boolean;
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
  collaboratorId,
}: AnalyzeEvidencesParams): Promise<AnalyzeResult> {
  try {
    // If it's a DISC profile, use the specialized function
    if (sourceType === 'perfil_disc') {
      return await analyzeDiscProfile({ projectId, assetId, content });
    }

    // Format source description with source type
    const sourceConfig = SOURCE_TYPES[sourceType];
    const formattedSource = `${sourceConfig.icon} ${sourceConfig.label} • ${sourceDescription}`;
    
    // Call the Edge Function with collaborator context
    const { data, error: functionError } = await supabase.functions.invoke('analyze-evidences', {
      body: { content, collaboratorId }
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

// Specialized function for DISC profile analysis
async function analyzeDiscProfile({
  projectId,
  assetId,
  content,
}: {
  projectId: string;
  assetId: string;
  content: string;
}): Promise<AnalyzeResult> {
  try {
    const { data, error: functionError } = await supabase.functions.invoke('analyze-disc', {
      body: { projectId, assetId, content }
    });

    if (functionError) {
      console.error('analyze-disc error:', functionError);
      throw new Error(functionError.message || 'Failed to analyze DISC profile');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      count: 1, // One evidence is created automatically by the edge function
      collaborator: data.collaborator ? {
        id: data.collaborator.id,
        name: data.collaborator.name,
      } : undefined,
      isNewCollaborator: data.isNew,
    };
  } catch (error) {
    console.error('analyzeDiscProfile error:', error);
    return {
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
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
  
  // PDF files: extract text using pdf.js
  if (fileName.endsWith('.pdf')) {
    try {
      const pdfjs = await import('pdfjs-dist');
      
      // Use the worker from CDN for reliable loading
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      console.log(`Extracted ${fullText.length} chars from PDF (${pdf.numPages} pages)`);
      
      if (!fullText.trim()) {
        console.warn('PDF has no extractable text - may be scanned/image-based');
        return `[PDF sem texto extraível - ${file.name}]\n\nO PDF parece ser baseado em imagem/escaneado. Por favor, use um PDF com texto selecionável.`;
      }
      
      return fullText;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return `[Erro ao extrair texto do PDF - ${file.name}]\n\nNão foi possível processar o PDF. Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`;
    }
  }
  
  // Unsupported file type
  return null;
}
