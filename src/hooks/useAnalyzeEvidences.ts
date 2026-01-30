import { supabase } from '@/integrations/supabase/client';
import type { Pilar, SourceType, ImpactType, CriticalityType } from '@/lib/types';
import { SOURCE_TYPES } from '@/lib/types';

interface AnalyzeEvidencesParams {
  projectId: string;
  assetId: string;
  content: string;
  sourceDescription: string;
  sourceType: SourceType;
  collaboratorId?: string;
}

// New interface matching the edge function output
interface ExtractedGap {
  gap: string;
  pilar: Pilar;
  benchmark: string;
  impacto: ImpactType;
  criticidade: CriticalityType;
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

    // Now receives 'gaps' instead of 'evidences'
    const gaps: ExtractedGap[] = data.gaps;

    if (!gaps || gaps.length === 0) {
      return { count: 0 };
    }

    console.log(`Received ${gaps.length} strategic gaps from AI`);

    // Map gaps to evidences table structure
    const evidencesToInsert = gaps.map((gap) => ({
      project_id: projectId,
      asset_id: assetId,
      pilar: gap.pilar,
      content: gap.gap,
      benchmark: gap.benchmark,
      impact: gap.impacto,
      criticality: gap.criticidade,
      source_description: formattedSource,
      status: 'pendente' as const,
      is_divergence: gap.is_divergence || false,
      divergence_description: gap.divergence_description || null,
      evidence_type: gap.is_divergence ? 'divergencia' as const : 'fato' as const,
    }));

    const { error: insertError } = await supabase
      .from('evidences')
      .insert(evidencesToInsert);

    if (insertError) {
      console.error('Failed to insert gaps:', insertError);
      throw new Error('Failed to save gaps to database');
    }

    return { count: gaps.length };
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
