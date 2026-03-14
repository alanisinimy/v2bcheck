import { cn } from '@/shared/lib/utils';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';

interface Step {
  label: string;
  description: string;
}

interface SetupStepperProps {
  steps: Step[];
  currentStep: number;
}

export function SetupStepper({ steps, currentStep }: SetupStepperProps) {
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-2xl mx-auto">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted
                    ? 'hsl(var(--primary))'
                    : isActive
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--muted))',
                }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  isCompleted || isActive
                    ? 'text-primary-foreground'
                    : 'text-muted-foreground'
                )}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
              </motion.div>
              <div className="text-center">
                <p className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block">
                  {step.description}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 mx-3 mt-[-20px]">
                <div className="h-[2px] bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={false}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
