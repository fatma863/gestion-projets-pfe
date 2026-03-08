import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { usePermission } from '../../hooks/usePermission';
import { Bell, LogOut, Menu, Check, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUnreadCount, useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../../hooks/useNotifications';
import { Avatar } from '../ui/Avatar';

export default function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { isAdmin, isManager } = usePermission();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifData } = useNotifications({ perPage: 5, queryOptions: { enabled: dropdownOpen } });
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const recentNotifications = notifData?.notifications || [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-white/80 backdrop-blur-sm px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 hover:bg-accent transition-colors lg:hidden"
        >
          <Menu size={18} className="text-muted-foreground" />
        </button>
        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-sm text-muted-foreground w-64 cursor-default">
          <Search size={14} />
          <span className="text-xs">Rechercher...</span>
          <kbd className="ml-auto rounded border border-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="relative rounded-lg p-2 hover:bg-accent transition-colors"
          >
            <Bell size={18} className="text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                {unreadCount > 99 ? '99' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border border-border bg-white shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <span className="text-sm font-semibold text-foreground">Notifications</span>
                <button
                  onClick={() => markAll.mutate()}
                  disabled={unreadCount === 0}
                  className={`text-xs font-medium transition-colors ${unreadCount === 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:text-primary/80'}`}
                >
                  Tout marquer lu
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                {recentNotifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification</p>
                ) : (
                  recentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20 ${
                        notif.read_at ? '' : 'bg-primary/[0.03]'
                      }`}
                    >
                      <div className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${notif.read_at ? 'bg-transparent' : 'bg-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{notif.title || notif.type}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                        <p className="mt-1 text-[11px] text-muted-foreground/60">
                          {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => markRead.mutate(notif.id)}
                        disabled={!!notif.read_at}
                        className={`mt-1 p-1 rounded-md transition-colors ${notif.read_at ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent'}`}
                        title={notif.read_at ? 'Déjà lu' : 'Marquer comme lu'}
                      >
                        <Check size={14} className="text-muted-foreground" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border px-4 py-2.5 bg-muted/20">
                <button
                  onClick={() => { setDropdownOpen(false); navigate(isAdmin ? '/admin/notifications' : isManager ? '/manager/notifications' : '/app/notifications'); }}
                  className="w-full text-center text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Voir toutes les notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name} size="sm" />
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">{user?.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-lg p-2 hover:bg-red-50 transition-colors group"
          title="Déconnexion"
        >
          <LogOut size={16} className="text-muted-foreground group-hover:text-red-500 transition-colors" />
        </button>
      </div>
    </header>
  );
}
