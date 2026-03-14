import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Project } from '@/shared/types';

const LAST_PROJECT_KEY = 'vendas2b_last_project_id';

interface CreateProjectData {
  name: string;
  client_name: string;
  description?: string;
  sector?: string;
  company_size?: string;
  custom_pilares?: { id: string; label: string; icon: string }[];
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setCurrentProject: (project: Project) => void;
  addProject: (data: CreateProjectData) => Promise<void>;
  clearCurrentProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);

  const { data: projects = [], isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Project[];
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          name: data.name,
          client_name: data.client_name,
          description: data.description,
          sector: data.sector,
          company_size: data.company_size,
          custom_pilares: data.custom_pilares as any,
        })
        .select()
        .single();
      if (error) throw error;
      return newProject as unknown as Project;
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setCurrentProject(newProject);
    },
  });

  useEffect(() => {
    if (projects.length > 0 && !currentProject) {
      const lastProjectId = localStorage.getItem(LAST_PROJECT_KEY);
      if (lastProjectId) {
        const lastProject = projects.find(p => p.id === lastProjectId);
        if (lastProject) {
          setCurrentProjectState(lastProject);
        }
      }
    }
  }, [projects, currentProject]);

  const setCurrentProject = useCallback((project: Project) => {
    setCurrentProjectState(project);
    localStorage.setItem(LAST_PROJECT_KEY, project.id);
  }, []);

  const addProject = useCallback(async (data: CreateProjectData) => {
    await createProjectMutation.mutateAsync(data);
  }, [createProjectMutation]);

  const clearCurrentProject = useCallback(() => {
    setCurrentProjectState(null);
    localStorage.removeItem(LAST_PROJECT_KEY);
  }, []);

  const isLoading = isLoadingProjects || createProjectMutation.isPending;

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        isLoading,
        setCurrentProject,
        addProject,
        clearCurrentProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
}
