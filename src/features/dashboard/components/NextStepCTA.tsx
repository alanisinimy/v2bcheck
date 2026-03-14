import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface NextStepCTAProps {
  message: string;
  cta: string;
  href: string;
}

export function NextStepCTA({ message, cta, href }: NextStepCTAProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="rounded-2xl bg-gradient-to-r from-primary/10 via-success/10 to-primary/5 border border-primary/20 p-6 flex items-center gap-5"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 shadow-sm">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Próximo passo</p>
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
      <Button
        onClick={() => navigate(href)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex-shrink-0"
      >
        {cta}
      </Button>
    </motion.div>
  );
}
