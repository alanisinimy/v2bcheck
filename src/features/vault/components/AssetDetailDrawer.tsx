import { motion } from 'framer-motion';
import { X, FileText } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SOURCE_TYPES, type Asset } from '@/shared/types/vault';
import { PILARES } from '@/shared/types/project';
import { STATUS_CONFIG, CRITICALITY_CONFIG, type Evidence } from '@/shared/types/gap';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface AssetDetailDrawerProps {
  asset: Asset | null;
  evidences: Evidence[];
  open: boolean;
  onClose: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetDetailDrawer({ asset, evidences, open, onClose }: AssetDetailDrawerProps) {
  if (!asset) return null;

  const assetEvidences = evidences.filter(e => e.asset_id === asset.id);
  const sourceType = asset.source_type ? SOURCE_TYPES[asset.source_type as keyof typeof SOURCE_TYPES] : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-[420px] sm:w-[480px] p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <span className="truncate">{asset.file_name}</span>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="px-6 pb-6 space-y-6">
            {/* Metadata */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Detalhes</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Tamanho</p>
                  <p className="font-medium text-foreground">{formatFileSize(asset.file_size)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  <p className="font-medium text-foreground">{asset.file_type}</p>
                </div>
                {sourceType && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs">Fonte</p>
                    <p className="font-medium text-foreground">{sourceType.icon} {sourceType.label}</p>
                  </div>
                )}
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Enviado em</p>
                  <p className="font-medium text-foreground">
                    {new Date(asset.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Extracted evidences */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Gaps Extraídos
                </h4>
                <Badge variant="secondary" className="text-xs">{assetEvidences.length}</Badge>
              </div>

              {assetEvidences.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum gap extraído deste arquivo.
                </p>
              ) : (
                <div className="space-y-3">
                  {assetEvidences.map((ev) => {
                    const pilarConfig = PILARES[ev.pilar];
                    const statusConf = STATUS_CONFIG[ev.status];
                    const criticality = ev.criticality as keyof typeof CRITICALITY_CONFIG | undefined;
                    const critConf = criticality ? CRITICALITY_CONFIG[criticality] : null;

                    return (
                      <div key={ev.id} className="rounded-xl border border-border/50 bg-muted/30 p-3 space-y-2">
                        <p className="text-sm text-foreground leading-relaxed">{ev.content}</p>

                        {ev.benchmark && (
                          <p className="text-xs text-muted-foreground italic">
                            💡 Benchmark: {ev.benchmark}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                            {pilarConfig.icon} {pilarConfig.label}
                          </span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', statusConf.color)}>
                            {statusConf.label}
                          </span>
                          {critConf && (
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', critConf.color)}>
                              {critConf.label}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
