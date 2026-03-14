import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const PREDEFINED_ROLES = [
  { value: 'SDR', label: 'SDR', description: 'Sales Development Representative' },
  { value: 'BDR', label: 'BDR', description: 'Business Development Representative' },
  { value: 'Closer', label: 'Closer', description: 'Account Executive / Closer' },
  { value: 'Farmer', label: 'Farmer', description: 'Customer Success / Account Manager' },
  { value: 'Gerente', label: 'Gerente', description: 'Sales Manager' },
  { value: 'Diretor', label: 'Diretor', description: 'Sales Director' },
  { value: 'Consultor', label: 'Consultor', description: 'Sales Consultant' },
] as const;

interface RoleSelectorProps {
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function RoleSelector({ value, onChange, disabled, className }: RoleSelectorProps) {
  // Check if current value is in predefined roles
  const isCustomRole = value && !PREDEFINED_ROLES.some(r => r.value === value);

  return (
    <Select
      value={value || ''}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Selecionar cargo">
          {value || 'Selecionar cargo'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PREDEFINED_ROLES.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            <div className="flex flex-col">
              <span className="font-medium">{role.label}</span>
              <span className="text-xs text-muted-foreground">{role.description}</span>
            </div>
          </SelectItem>
        ))}
        {isCustomRole && (
          <SelectItem value={value}>
            <div className="flex flex-col">
              <span className="font-medium">{value}</span>
              <span className="text-xs text-muted-foreground">Cargo customizado</span>
            </div>
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
