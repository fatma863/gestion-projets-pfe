import { useAuth } from '../../contexts/AuthContext';
import { Bell, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Gestion des Projets PFE
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/notifications')}
          className="relative rounded-md p-2 hover:bg-accent transition-colors"
        >
          <Bell size={20} className="text-muted-foreground" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user?.name?.charAt(0)?.toUpperCase() || <User size={16} />}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="rounded-md p-2 hover:bg-accent transition-colors"
          title="Déconnexion"
        >
          <LogOut size={20} className="text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
