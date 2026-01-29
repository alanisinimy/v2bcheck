import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Project } from '@/lib/types';

// localStorage keys
const STORAGE_KEYS = {
  lastProjectId: 'vendas2b_last_project_id',
  projects: 'vendas2b_projects',
};

// Mock projects for demo
const MOCK_PROJECTS: Project[] = [
  {
    id: 'techcorp-brasil',
    name: 'Diagnóstico Comercial',
    client_name: 'TechCorp Brasil',
    description: 'Auditoria completa do processo comercial',
    start_date: '2024-01-15',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'startupxyz',
    name: 'Auditoria de Vendas',
    client_name: 'StartupXYZ',
    description: 'Análise de funil e processos',
    start_date: '2024-02-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

interface CreateProjectData {
  name: string;
  client_name: string;
  description?: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  isLoading: boolean;
  setCurrentProject: (project: Project) => void;
  addProject: (data: CreateProjectData) => void;
  clearCurrentProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize projects and restore last selected project
  useEffect(() => {
    const initializeProjects = () => {
      // Try to load projects from localStorage
      const storedProjects = localStorage.getItem(STORAGE_KEYS.projects);
      let loadedProjects: Project[];

      if (storedProjects) {
        try {
          loadedProjects = JSON.parse(storedProjects);
        } catch {
          loadedProjects = MOCK_PROJECTS;
        }
      } else {
        // First time: use mock projects
        loadedProjects = MOCK_PROJECTS;
        localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(MOCK_PROJECTS));
      }

      setProjects(loadedProjects);

      // Restore last selected project
      const lastProjectId = localStorage.getItem(STORAGE_KEYS.lastProjectId);
      if (lastProjectId) {
        const lastProject = loadedProjects.find(p => p.id === lastProjectId);
        if (lastProject) {
          setCurrentProjectState(lastProject);
        }
      }

      setIsLoading(false);
    };

    initializeProjects();
  }, []);

  // Set current project and persist to localStorage
  const setCurrentProject = useCallback((project: Project) => {
    setCurrentProjectState(project);
    localStorage.setItem(STORAGE_KEYS.lastProjectId, project.id);
  }, []);

  // Add new project
  const addProject = useCallback((data: CreateProjectData) => {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: data.name,
      client_name: data.client_name,
      description: data.description,
      start_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setProjects(prev => {
      const updated = [newProject, ...prev];
      localStorage.setItem(STORAGE_KEYS.projects, JSON.stringify(updated));
      return updated;
    });

    // Auto-select the new project
    setCurrentProject(newProject);
  }, [setCurrentProject]);

  // Clear current project selection
  const clearCurrentProject = useCallback(() => {
    setCurrentProjectState(null);
    localStorage.removeItem(STORAGE_KEYS.lastProjectId);
  }, []);

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
