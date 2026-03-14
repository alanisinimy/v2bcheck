import { motion } from 'framer-motion';
import { FolderOpen, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from '@/features/projeto/components/CreateProjectDialog';
import { useState } from 'react';

export function EmptyProjectState() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center max-w-md"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6 shadow-soft"
        >
          <FolderOpen className="w-12 h-12 text-primary" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-foreground mb-2"
        >
          Bem-vindo ao Vendas2B Intelligence
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-8"
        >
          Crie seu primeiro projeto de diagnóstico para começar a analisar e validar evidências comerciais.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-6 text-sm text-muted-foreground mb-8"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>IA como Auditora</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Humano como Juiz</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            size="lg"
            onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-soft active-scale gap-2"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Projeto
          </Button>
        </motion.div>

        <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      </motion.div>
    </div>
  );
}
