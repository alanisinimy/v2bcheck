import { useLocation, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyProjectState } from '@/components/layout/EmptyProjectState';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TeamAccessTab } from '@/features/settings/components/TeamAccessTab';
import { PilaresTab } from '@/features/settings/components/PilaresTab';

export default function Settings() {
  const { currentProject, isLoading } = useProjectContext();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.includes('/settings/team') ? 'team' : 'pilares';

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </div>
      </AppLayout>
    );
  }

  if (!currentProject) {
    return (
      <AppLayout>
        <div className="p-6 md:p-10 max-w-6xl mx-auto">
          <EmptyProjectState />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <PageHeader
          title="Configurações"
          description="Gerencie os pilares do projeto e a equipe de acesso."
        />

        <Tabs
          value={activeTab}
          onValueChange={(val) => navigate(val === 'team' ? '/settings/team' : '/settings/pilares')}
        >
          <TabsList className="mb-6">
            <TabsTrigger value="pilares">⚙️ Pilares & Framework</TabsTrigger>
            <TabsTrigger value="team">👤 Equipe & Acessos</TabsTrigger>
          </TabsList>

          <TabsContent value="pilares">
            <PilaresTab />
          </TabsContent>

          <TabsContent value="team">
            <TeamAccessTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
