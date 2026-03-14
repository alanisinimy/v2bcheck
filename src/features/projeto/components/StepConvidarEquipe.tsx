import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Mail } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

export interface Invite {
  email: string;
  role: string;
}

const ROLES = [
  { value: 'consultant', label: 'Consultor', description: 'Acesso total ao projeto' },
  { value: 'manager', label: 'Gestor', description: 'Pode editar e visualizar' },
  { value: 'viewer', label: 'Visualizador', description: 'Apenas leitura' },
];

const ROLE_COLORS: Record<string, string> = {
  consultant: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-warning/10 text-warning-foreground border-warning/20',
  viewer: 'bg-muted text-muted-foreground border-border',
};

interface StepConvidarEquipeProps {
  invites: Invite[];
  onChange: (invites: Invite[]) => void;
}

export function StepConvidarEquipe({ invites, onChange }: StepConvidarEquipeProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('consultant');

  const addInvite = () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return;
    if (invites.some(i => i.email === trimmed)) return;
    onChange([...invites, { email: trimmed, role }]);
    setEmail('');
  };

  const removeInvite = (emailToRemove: string) => {
    onChange(invites.filter(i => i.email !== emailToRemove));
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Convidar Equipe</h2>
        <p className="text-sm text-muted-foreground">
          Adicione membros ao projeto. Você pode pular esta etapa e convidar depois.
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Email do membro</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addInvite())}
              placeholder="nome@empresa.com"
              className="flex-1"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{r.label}</span>
                      <span className="text-[10px] text-muted-foreground">{r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={addInvite} disabled={!email.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Invites list */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {invites.map((invite) => {
              const roleInfo = ROLES.find(r => r.value === invite.role);
              return (
                <motion.div
                  key={invite.email}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                  </div>
                  <Badge variant="outline" className={ROLE_COLORS[invite.role] || ''}>
                    {roleInfo?.label}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeInvite(invite.email)}>
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {invites.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum convite adicionado ainda.</p>
              <p className="text-xs mt-1">Você pode convidar membros depois nas configurações.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
