import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, Users } from 'lucide-react';

type PeopleDataType = 'perfil_disc' | 'pesquisa_clima';

interface Collaborator {
  id: string;
  name: string;
}

interface PeopleDataTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileType: string;
  collaborators: Collaborator[];
  onSubmit: (dataType: PeopleDataType, collaboratorId?: string) => Promise<void>;
  isProcessing: boolean;
}

export function PeopleDataTypeModal({
  open,
  onOpenChange,
  fileName,
  fileType,
  collaborators,
  onSubmit,
  isProcessing,
}: PeopleDataTypeModalProps) {
  const isPdf = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const defaultType: PeopleDataType = isPdf ? 'perfil_disc' : 'pesquisa_clima';
  
  const [dataType, setDataType] = useState<PeopleDataType>(defaultType);
  const [collaboratorId, setCollaboratorId] = useState<string>('');

  const handleSubmit = async () => {
    await onSubmit(dataType, collaboratorId || undefined);
    setDataType(defaultType);
    setCollaboratorId('');
  };

  const handleClose = () => {
    if (!isProcessing) {
      setDataType(defaultType);
      setCollaboratorId('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Classificar Arquivo</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium truncate">{fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isPdf ? 'Documento PDF' : 'Arquivo CSV'}
            </p>
          </div>

          <div className="space-y-3">
            <Label>Tipo de Dados</Label>
            <RadioGroup
              value={dataType}
              onValueChange={(value) => setDataType(value as PeopleDataType)}
              disabled={isProcessing}
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="perfil_disc" id="perfil_disc" />
                <Label htmlFor="perfil_disc" className="flex items-center gap-2 cursor-pointer flex-1">
                  <FileText className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Perfil DISC</p>
                    <p className="text-xs text-muted-foreground">
                      PDF de avaliação comportamental individual
                    </p>
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="pesquisa_clima" id="pesquisa_clima" />
                <Label htmlFor="pesquisa_clima" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Users className="h-4 w-4 text-primary" />
                  <div>
                    <p className="font-medium">Pesquisa de Clima</p>
                    <p className="text-xs text-muted-foreground">
                      CSV com métricas de engajamento e satisfação
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {dataType === 'perfil_disc' && (
            <div className="space-y-2">
              <Label>Vincular a Colaborador (opcional)</Label>
              <Select
                value={collaboratorId}
                onValueChange={setCollaboratorId}
                disabled={isProcessing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um colaborador..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Criar novo colaborador</SelectItem>
                  {collaborators.map((collab) => (
                    <SelectItem key={collab.id} value={collab.id}>
                      {collab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Se não selecionado, um novo colaborador será criado automaticamente.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Processar Arquivo'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
