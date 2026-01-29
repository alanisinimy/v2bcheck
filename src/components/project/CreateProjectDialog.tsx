import { useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectContext } from '@/contexts/ProjectContext';
import { toast } from '@/hooks/use-toast';

interface CreateProjectDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateProjectDialog({ trigger, open, onOpenChange }: CreateProjectDialogProps) {
  const { addProject } = useProjectContext();
  const [internalOpen, setInternalOpen] = useState(false);
  const [clientName, setClientName] = useState('');
  const [sector, setSector] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName.trim()) return;

    setIsSubmitting(true);

    try {
      await addProject({
        name: 'Diagnóstico Comercial',
        client_name: clientName.trim(),
        description: sector.trim() || undefined,
      });

      toast({
        title: 'Projeto criado com sucesso',
        description: `${clientName} foi adicionado à sua lista de projetos.`,
      });

      // Reset form
      setClientName('');
      setSector('');
      setIsOpen(false);
    } catch (error) {
      toast({
        title: 'Erro ao criar projeto',
        description: 'Não foi possível criar o projeto. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-md glass border-border/50">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">Novo Diagnóstico</DialogTitle>
        <DialogDescription className="text-muted-foreground">
          Crie um novo projeto de diagnóstico comercial.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="client-name" className="text-foreground">
            Nome do Cliente/Empresa *
          </Label>
          <Input
            id="client-name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Ex: TechCorp Brasil"
            className="bg-background/50 border-border/50 focus:border-primary"
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sector" className="text-muted-foreground">
            Setor de Atuação (Opcional)
          </Label>
          <Input
            id="sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            placeholder="Ex: SaaS B2B, Varejo, Indústria"
            className="bg-background/50 border-border/50 focus:border-primary"
          />
        </div>

        <DialogFooter className="pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="mr-2"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!clientName.trim() || isSubmitting}
            className="bg-primary hover:bg-primary/90 active-scale"
          >
            {isSubmitting ? 'Criando...' : 'Criar Projeto'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="w-full justify-start gap-2 text-primary hover:text-primary hover:bg-primary/10">
            <Plus className="w-4 h-4" />
            Novo Projeto
          </Button>
        )}
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
