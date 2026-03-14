import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface Step {
  done: boolean;
  label: string;
  description: string;
}

interface ProjectStepperProps {
  steps: Step[];
  currentIndex: number;
  pct: number;
}

export function ProjectStepper({ steps, currentIndex, pct }: ProjectStepperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card shadow-soft overflow-hidden"
    >
      {/* Gradient progress bar */}
      <div className="h-1.5 bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="h-full bg-gradient-to-r from-primary to-success rounded-r-full"
        />
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progresso do Diagnóstico
          </span>
          <span className="text-sm font-bold text-primary">{pct}% concluído</span>
        </div>

        {/* Steps */}
        <div className="flex items-start gap-0">
          {steps.map((step, i) => {
            const isCurrent = i === currentIndex;
            const isDone = step.done;
            const isUpcoming = !isDone && !isCurrent;

            return (
              <div key={step.label} className="flex items-start flex-1">
                {/* Step */}
                <div className="flex flex-col items-center text-center flex-1">
                  {/* Circle */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all relative',
                      isDone && 'bg-success text-success-foreground',
                      isCurrent && 'border-2 border-primary text-primary bg-primary/10',
                      isUpcoming && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isDone ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span>{i + 1}</span>
                    )}
                    {isCurrent && (
                      <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
                    )}
                  </div>
                  {/* Label */}
                  <p className={cn(
                    'text-xs font-semibold mt-2',
                    isDone && 'text-success',
                    isCurrent && 'text-primary',
                    isUpcoming && 'text-muted-foreground'
                  )}>
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[100px] leading-tight">
                    {step.description}
                  </p>
                </div>

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="flex-shrink-0 w-8 mt-5">
                    <div className={cn(
                      'h-0.5 w-full rounded-full',
                      isDone ? 'bg-success' : 'bg-border'
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
