import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Pencil, Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface PilarConfig {
  id: string;
  label: string;
  icon: string;
}

const PILAR_ICONS = ['📊', '⚙️', '👥', '🏛️', '💻', '🎯', '📈', '🔧', '💡', '🤝'];

export const SECTOR_TEMPLATES: Record<string, PilarConfig[]> = {
  saas: [
    { id: 'processos', label: 'Processos Comerciais', icon: '⚙️' },
    { id: 'tecnologia', label: 'Tecnologia & CRM', icon: '💻' },
    { id: 'pessoas', label: 'Pessoas & Capacitação', icon: '👥' },
    { id: 'gestao', label: 'Gestão & Cultura', icon: '🏛️' },
    { id: 'dados', label: 'Dados & Métricas', icon: '📊' },
  ],
  industria: [
    { id: 'processos', label: 'Processos de Venda', icon: '⚙️' },
    { id: 'canais', label: 'Canais de Distribuição', icon: '🔧' },
    { id: 'pessoas', label: 'Força de Vendas', icon: '👥' },
    { id: 'gestao', label: 'Gestão Comercial', icon: '🏛️' },
    { id: 'pricing', label: 'Pricing', icon: '💡' },
  ],
  servicos: [
    { id: 'pipeline', label: 'Pipeline & Funil', icon: '📈' },
    { id: 'relacionamento', label: 'Relacionamento', icon: '🤝' },
    { id: 'pessoas', label: 'Equipe Comercial', icon: '👥' },
    { id: 'processos', label: 'Processos', icon: '⚙️' },
    { id: 'inteligencia', label: 'Inteligência de Mercado', icon: '🎯' },
  ],
  varejo: [
    { id: 'processos', label: 'Processos de Venda', icon: '⚙️' },
    { id: 'tecnologia', label: 'Tecnologia & PDV', icon: '💻' },
    { id: 'pessoas', label: 'Equipe de Loja', icon: '👥' },
    { id: 'gestao', label: 'Gestão Comercial', icon: '🏛️' },
    { id: 'dados', label: 'Dados & Conversão', icon: '📊' },
  ],
  outros: [
    { id: 'processos', label: 'Processos', icon: '⚙️' },
    { id: 'tecnologia', label: 'Tecnologia', icon: '💻' },
    { id: 'pessoas', label: 'Pessoas', icon: '👥' },
    { id: 'gestao', label: 'Gestão & Cultura', icon: '🏛️' },
    { id: 'dados', label: 'Dados & Métricas', icon: '📊' },
  ],
};

interface StepConfigurarPilaresProps {
  sector: string;
  pilares: PilarConfig[];
  onChange: (pilares: PilarConfig[]) => void;
}

export function StepConfigurarPilares({ sector, pilares, onChange }: StepConfigurarPilaresProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (pilar: PilarConfig) => {
    setEditingId(pilar.id);
    setEditValue(pilar.label);
  };

  const confirmEdit = () => {
    if (!editingId || !editValue.trim()) return;
    onChange(pilares.map(p => p.id === editingId ? { ...p, label: editValue.trim() } : p));
    setEditingId(null);
  };

  const removePilar = (id: string) => {
    if (pilares.length <= 3) return;
    onChange(pilares.filter(p => p.id !== id));
  };

  const addPilar = () => {
    if (pilares.length >= 7) return;
    const usedIcons = new Set(pilares.map(p => p.icon));
    const availableIcon = PILAR_ICONS.find(i => !usedIcons.has(i)) || '📌';
    const newId = `custom_${Date.now()}`;
    onChange([...pilares, { id: newId, label: 'Novo Pilar', icon: availableIcon }]);
    startEdit({ id: newId, label: 'Novo Pilar', icon: availableIcon });
  };

  const sectorLabel = sector ? (
    { saas: 'SaaS', industria: 'Indústria', servicos: 'Serviços', varejo: 'Varejo', outros: 'Outros' }[sector] || sector
  ) : '';

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold text-foreground">Configurar Pilares</h2>
        <p className="text-sm text-muted-foreground">
          Template pré-configurado para <Badge variant="secondary">{sectorLabel}</Badge>. Personalize conforme necessário.
        </p>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {pilares.map((pilar) => (
            <motion.div
              key={pilar.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
            >
              <span className="text-lg shrink-0">{pilar.icon}</span>

              {editingId === pilar.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmEdit()}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={confirmEdit}>
                    <Check className="w-4 h-4 text-primary" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium text-foreground">{pilar.label}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(pilar)}>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removePilar(pilar.id)}
                    disabled={pilares.length <= 3}
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {pilares.length < 7 && (
          <Button variant="outline" className="w-full gap-2" onClick={addPilar}>
            <Plus className="w-4 h-4" />
            Adicionar Pilar
          </Button>
        )}

        <p className="text-xs text-muted-foreground text-center">
          {pilares.length}/7 pilares • mínimo 3
        </p>
      </div>
    </div>
  );
}
