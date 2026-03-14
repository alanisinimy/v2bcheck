import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeopleDataUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function PeopleDataUploadZone({ onFilesSelected, disabled }: PeopleDataUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/csv': ['.csv'],
    },
    disabled,
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
        isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Upload className="h-8 w-8" />
        </div>
        
        {isDragActive ? (
          <p className="text-primary font-medium">Solte o arquivo aqui...</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="font-medium">Upload de Dados de Pessoas</p>
              <p className="text-sm text-muted-foreground">
                Arraste arquivos ou clique para selecionar (múltiplos)
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span>PDF (Perfil DISC)</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>CSV (Pesquisa de Clima)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
