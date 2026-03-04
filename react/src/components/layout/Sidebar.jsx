import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CalendarRange,
  Brain,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/projects', icon: FolderKanban, label: 'Projets' },
  { to: '/teams', icon: Users, label: 'Équipes' },
  { to: '/gantt', icon: CalendarRange, label: 'Gantt' },
  { to: '/ai', icon: Brain, label: 'IA & Analytics' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col bg-sidebar text-sidebar-foreground transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight">GPF</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 hover:bg-white/10 transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon size={20} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings */}
      <div className="border-t border-white/10 px-2 py-3">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-slate-300 hover:bg-white/10 hover:text-white'
            )
          }
        >
          <Settings size={20} />
          {!collapsed && <span>Paramètres</span>}
        </NavLink>
      </div>
    </aside>
  );
}
