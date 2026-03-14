import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Mail, Send, Trash2, X, Shield, Crown, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import {
  useProjectMembers,
  useProjectInvites,
  useCreateInvite,
  useCancelInvite,
  useRemoveMember,
} from '../hooks/useProjectMembers';
import { toast } from 'sonner';
import { cn } from '@/shared/lib/utils';

const AVATAR_COLORS = [
  'bg-primary text-primary-foreground',
  'bg-info text-white',
  'bg-warning text-warning-foreground',
  'bg-destructive text-destructive-foreground',
  'bg-success text-success-foreground',
];

const ROLE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline'; icon: typeof Shield }> = {
  owner: { label: 'OWNER', variant: 'default', icon: Crown },
  admin: { label: 'ADMIN', variant: 'secondary', icon: Shield },
  viewer: { label: 'VIEWER', variant: 'outline', icon: Users },
};

function getInitials(str: string) {
  return str.split(/[@.\s]/).filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TeamAccessTab() {
  const { currentProject } = useProjectContext();
  const { user } = useAuth();
  const projectId = currentProject?.id;

  const { data: members = [], isLoading: membersLoading } = useProjectMembers(projectId);
  const { data: invites = [], isLoading: invitesLoading } = useProjectInvites(projectId);
  const createInvite = useCreateInvite();
  const cancelInvite = useCancelInvite();
  const removeMember = useRemoveMember();

  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');

  const handleInvite = async () => {
    if (!email.trim() || !projectId) return;
    try {
      await createInvite.mutateAsync({ projectId, email: email.trim(), role: inviteRole });
      toast.success('Convite enviado com sucesso');
      setEmail('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar convite');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!projectId) return;
    try {
      await removeMember.mutateAsync({ memberId, projectId });
      toast.success('Membro removido');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover membro');
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!projectId) return;
    try {
      await cancelInvite.mutateAsync({ inviteId, projectId });
      toast.success('Convite cancelado');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cancelar convite');
    }
  };

  const activeMembers = members.length;
  const pendingInvites = invites.length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground">{activeMembers}</p>
              <p className="text-xs text-muted-foreground">Membros ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-warning-light flex items-center justify-center">
              <Mail className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground">{pendingInvites}</p>
              <p className="text-xs text-muted-foreground">Convites pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-info-light flex items-center justify-center">
              <Shield className="w-5 h-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-foreground">1</p>
              <p className="text-xs text-muted-foreground">Projeto vinculado</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Convidar Membro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="label-mono">Email</label>
              <Input
                placeholder="email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                type="email"
              />
            </div>
            <div className="w-32 space-y-1.5">
              <label className="label-mono">Papel</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleInvite} disabled={!email.trim() || createInvite.isPending} className="gap-2">
              <Send className="w-4 h-4" />
              Enviar Convite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Membros da Equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {membersLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
          ) : (
            members.map((member, idx) => {
              const roleConf = ROLE_CONFIG[member.role] || ROLE_CONFIG.viewer;
              const isOwner = member.role === 'owner';
              const isSelf = member.user_id === user?.id;
              const colorClass = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const displayName = member.user_id === user?.id ? (user?.email?.split('@')[0] || 'Você') : `Membro ${idx + 1}`;
              const displayEmail = member.user_id === user?.id ? (user?.email || '') : '';

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-soft transition-shadow"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={cn('text-xs font-semibold', colorClass)}>
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                    {displayEmail && <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>}
                  </div>
                  <Badge variant={roleConf.variant} className="label-mono text-[10px]">
                    {roleConf.label}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(member.created_at)}
                  </div>
                  {!isOwner && !isSelf && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive-light"
                      onClick={() => handleRemoveMember(member.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </motion.div>
              );
            })
          )}

          {/* Pending Invites */}
          {invites.map((invite, idx) => (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (members.length + idx) * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-lg border border-dashed bg-card"
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
                  {getInitials(invite.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                <p className="text-xs text-muted-foreground">Convite pendente</p>
              </div>
              <Badge variant="outline" className="label-mono text-[10px] bg-warning-light text-warning-foreground border-warning/30">
                PENDENTE
              </Badge>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive-light"
                onClick={() => handleCancelInvite(invite.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}

          {members.length === 0 && invites.length === 0 && !membersLoading && (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum membro encontrado.</p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-destructive">Zona de Risco</h3>
              <p className="text-xs text-muted-foreground mt-1">Transferir ownership da conta para outro membro do projeto.</p>
            </div>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive-light">
              Transferir Ownership
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
