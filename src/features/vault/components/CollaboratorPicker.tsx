import { UserPlus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollaborators, type Collaborator } from '@/hooks/useCollaborators';

interface CollaboratorPickerProps {
  projectId: string;
  value: string | null;
  onChange: (collaboratorId: string | null) => void;
  onCreateNew?: () => void;
}

const CREATE_NEW_VALUE = '__create_new__';
const GENERAL_VALUE = '__general__';

export function CollaboratorPicker({
  projectId,
  value,
  onChange,
  onCreateNew,
}: CollaboratorPickerProps) {
  const { data: collaborators = [], isLoading } = useCollaborators(projectId);

  const handleValueChange = (newValue: string) => {
    if (newValue === CREATE_NEW_VALUE) {
      onCreateNew?.();
      return;
    }
    
    if (newValue === GENERAL_VALUE) {
      onChange(null);
      return;
    }
    
    onChange(newValue);
  };

  const selectedValue = value || GENERAL_VALUE;

  return (
    <Select value={selectedValue} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isLoading ? 'Carregando...' : 'Selecionar colaborador...'} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={GENERAL_VALUE}>
          <span className="flex items-center gap-2">
            <span className="text-muted-foreground">📁</span>
            <span>Geral (Sem vínculo)</span>
          </span>
        </SelectItem>
        
        {collaborators.length > 0 && (
          <>
            <SelectSeparator />
            {collaborators.map((collaborator) => (
              <SelectItem key={collaborator.id} value={collaborator.id}>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground">👤</span>
                  <span>{collaborator.name}</span>
                  {collaborator.role && (
                    <span className="text-xs text-muted-foreground">
                      ({collaborator.role})
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </>
        )}
        
        <SelectSeparator />
        <SelectItem value={CREATE_NEW_VALUE}>
          <span className="flex items-center gap-2 text-primary">
            <UserPlus className="w-4 h-4" />
            <span>Criar novo colaborador</span>
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
