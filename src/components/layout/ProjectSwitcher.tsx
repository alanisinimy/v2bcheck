import { ChevronDown, Check, FolderOpen, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useProjectContext } from '@/contexts/ProjectContext';
import { CreateProjectDialog } from '@/components/project/CreateProjectDialog';
import { useState } from 'react';

interface ProjectSwitcherProps {
  collapsed?: boolean;
}

export function ProjectSwitcher({ collapsed = false }: ProjectSwitcherProps) {
  const { currentProject, projects, setCurrentProject } = useProjectContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-accent/50 hover:bg-accent transition-colors active-scale text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <FolderOpen className="w-4 h-4 text-primary" />
            </div>
            
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {currentProject?.client_name || 'Selecione um projeto'}
                  </p>
                  {currentProject && (
                    <p className="text-xs text-muted-foreground truncate">
                      {currentProject.name}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className="w-64 bg-popover/95 backdrop-blur-xl border-border/50"
          sideOffset={8}
        >
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              onClick={() => setCurrentProject(project)}
              className="flex items-center gap-3 py-2.5 cursor-pointer focus:bg-accent"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                <FolderOpen className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {project.client_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {project.name}
                </p>
              </div>
              {currentProject?.id === project.id && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="bg-border/50" />

          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-3 py-2.5 cursor-pointer text-primary focus:text-primary focus:bg-primary/10"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium">Novo Projeto</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
