import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, FolderOpen, Plus, ChevronLeft, ChevronRight, Settings, Users as UsersIcon, LogOut, Sun, Moon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTheme } from '@/shared/hooks/useTheme';
import { useProjectContext } from '@/shared/contexts/ProjectContext';
import { useAuth } from '@/shared/contexts/AuthContext';
import { useAssets, useEvidences } from '@/hooks/useProject';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const navItems = [
  { label: 'Dashboard', emoji: '📊', path: '/' },
  { label: 'The Vault', emoji: '🗂', path: '/vault', badgeKey: 'vault' as const },
  { label: 'Matriz de Diagnóstico', emoji: '🔍', path: '/matriz', badgeKey: 'gaps' as const },
  { label: 'Time', emoji: '👥', path: '/team' },
  { label: 'Plano Estratégico', emoji: '🎯', path: '/plan' },
];

const settingsItems = [
  { label: 'Pilares & Framework', emoji: '⚙️', path: '/settings/pilares' },
  { label: 'Equipe & Acessos', emoji: '👤', path: '/settings/team' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { currentProject, projects, setCurrentProject } = useProjectContext();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();

  // Badges data
  const { data: assets = [] } = useAssets(currentProject?.id);
  const { data: evidences = [] } = useEvidences(currentProject?.id);
  const pendingGaps = evidences.filter(e => e.status === 'pendente').length;

  const email = user?.email || '';
  const initials = email.split('@')[0].slice(0, 2).toUpperCase();

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="h-screen flex flex-col sticky top-0 bg-white border-r shrink-0"
      style={{ borderColor: '#e8eaed' }}
    >
      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: '#e8eaed' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ backgroundColor: '#16a34a' }}>
            V2
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <h1 className="font-semibold text-foreground text-sm whitespace-nowrap leading-tight">Vendas2B</h1>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Intelligence</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Project Switcher */}
      <div className="px-3 py-3 border-b" style={{ borderColor: '#e8eaed' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors active-scale text-left',
                currentProject ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-primary-light">
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
                      {currentProject?.name || 'Selecione um projeto'}
                    </p>
                    {currentProject && (
                      <p className="text-xs text-muted-foreground truncate">{currentProject.client_name}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {!collapsed && <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64" sideOffset={8}>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => setCurrentProject(project)}
                className="flex items-center gap-3 py-2.5 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{project.client_name}</p>
                </div>
                {currentProject?.id === project.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => nav('/projeto/novo')}
              className="flex items-center gap-3 py-2.5 cursor-pointer text-primary"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Novo Projeto</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const badgeCount = item.badgeKey === 'vault' ? assets.length : item.badgeKey === 'gaps' ? pendingGaps : 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 active-scale group relative',
                isActive
                  ? 'bg-accent font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              {/* Active indicator — green left border */}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                  style={{ backgroundColor: '#16a34a' }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <span className="text-base shrink-0">{item.emoji}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm whitespace-nowrap overflow-hidden flex-1"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && item.badgeKey && badgeCount > 0 && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'h-5 min-w-5 px-1.5 text-[10px] font-medium',
                    item.badgeKey === 'gaps' && 'bg-warning/15 text-warning-foreground border-warning/30'
                  )}
                >
                  {badgeCount}
                </Badge>
              )}
            </NavLink>
          );
        })}

        {/* Settings Section */}
        <div className="pt-4">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Configurações
            </p>
          )}
          {settingsItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 active-scale',
                  isActive
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <span className="text-base shrink-0">{item.emoji}</span>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Footer — User + Collapse */}
      <div className="px-3 py-3 border-t space-y-2" style={{ borderColor: '#e8eaed' }}>
        {/* User Info */}
        <div className={cn('flex items-center gap-3 px-2', collapsed && 'justify-center px-0')}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">{initials}</AvatarFallback>
          </Avatar>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 min-w-0 overflow-hidden"
              >
                <p className="text-sm font-medium text-foreground truncate">{email.split('@')[0]}</p>
                <p className="text-[11px] text-muted-foreground truncate">Consultor</p>
              </motion.div>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              onClick={signOut}
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors active-scale"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="text-xs font-medium">Recolher</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
