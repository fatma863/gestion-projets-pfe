import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CalendarRange,
  Brain,
  Bell,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ListTodo,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { usePermission } from '../../hooks/usePermission';

const allSections = [
  {
    label: 'Espace de travail',
    items: [
      { to: '/app/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', match: '/app/dashboard' },
      { to: '/app/my-tasks', icon: ListTodo, label: 'Mes tâches', match: '/app/my-tasks', hideForViewer: true },
    ],
  },
  {
    label: 'Projets',
    items: [
      { to: '/app/projects', icon: FolderKanban, label: 'Mes projets', match: '/app/projects' },
      { to: '/app/teams', icon: Users, label: 'Équipes', match: '/app/teams' },
      { to: '/app/gantt', icon: CalendarRange, label: 'Gantt', match: '/app/gantt' },
    ],
  },
  {
    label: 'Outils',
    items: [
      { to: '/app/ai', icon: Sparkles, label: 'IA', match: '/app/ai', hideForViewer: true },
      { to: '/app/notifications', icon: Bell, label: 'Notifications', match: '/app/notifications' },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { isViewer } = usePermission();

  const sections = allSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => !(isViewer && item.hideForViewer)),
  })).filter((section) => section.items.length > 0);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-white/[0.06] bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed && (
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary font-bold text-white text-xs">G</div>
            <span className="text-sm font-semibold tracking-tight text-white">GP</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar">
        {sections.map((section, i) => (
          <div key={section.label} className={cn(i > 0 && 'mt-5')}>
            {!collapsed && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, match }) => {
                const isActive = location.pathname === match || location.pathname.startsWith(match + '/');
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={onClose}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
                      isActive
                        ? 'bg-white/[0.12] text-white shadow-sm shadow-black/10'
                        : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-r-full bg-primary" />
                    )}
                    <Icon size={18} className={cn('shrink-0', isActive ? 'text-primary-foreground' : 'text-slate-500 group-hover:text-slate-400')} />
                    {!collapsed && <span>{label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Profile / Settings */}
      <div className="border-t border-white/[0.06] px-2 py-2.5">
        <NavLink
          to="/app/settings"
          onClick={onClose}
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150',
            location.pathname.startsWith('/app/settings')
              ? 'bg-white/[0.12] text-white'
              : 'text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
          )}
        >
          <Settings size={18} className="shrink-0 text-slate-500" />
          {!collapsed && <span>Mon profil</span>}
        </NavLink>
      </div>
    </aside>
  );
}
