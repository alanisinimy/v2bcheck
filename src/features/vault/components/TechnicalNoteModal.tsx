import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText } from 'lucide-react';

interface TechnicalNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (title: string, content: string) => Promise<void>;
  isProcessing: boolean;
}

export function TechnicalNoteModal({
  open,
  onOpenChange,
  onSubmit,
  isProcessing,
}: TechnicalNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    await onSubmit(title.trim() || 'Nota Técnica', content.trim());
    setTitle('');
    setContent('');
  };

  const handleClose = () => {
    if (!isProcessing) {
      setTitle('');
      setContent('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Adicionar Nota Técnica
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Insira observações, análises ou insights identificados durante o diagnóstico.
            Estas notas serão tratadas como <strong>fonte de alta confiança</strong> pela IA.
          </p>

          <div className="space-y-2">
            <Label htmlFor="note-title">Título / Assunto (opcional)</Label>
            <Input
              id="note-title"
              placeholder="Ex: Observações sobre o processo de vendas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isProcessing}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-content">Conteúdo da Nota *</Label>
            <Textarea
              id="note-content"
              placeholder="Descreva suas observações, gaps identificados, problemas de processo, etc.

Exemplo:
- O time comercial não possui playbook de vendas documentado
- Os dados no CRM estão desatualizados há mais de 30 dias
- Falta de rituais de gestão (1:1s, pipeline review)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isProcessing}
              className="min-h-[200px] resize-y"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isProcessing || !content.trim()}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
            ) : (
              'Enviar para Análise'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
