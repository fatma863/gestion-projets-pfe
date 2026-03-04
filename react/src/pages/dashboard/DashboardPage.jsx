import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Users,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeProjects = projects?.filter((p) => p.status === 'active') || [];
  const totalProjects = projects?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour, {user?.name} 👋
        </h1>
        <p className="text-muted-foreground">
          Voici un aperçu de vos projets
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label="Projets totaux"
          value={totalProjects}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          icon={TrendingUp}
          label="Projets actifs"
          value={activeProjects.length}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          icon={Users}
          label="Mon rôle"
          value={user?.roles?.[0]?.name || 'Membre'}
          color="text-purple-600 bg-purple-50"
        />
        <StatCard
          icon={Clock}
          label="Aujourd'hui"
          value={new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
          color="text-amber-600 bg-amber-50"
        />
      </div>

      {/* Projects list */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Mes projets</h2>
        {projects?.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucun projet trouvé. Créez votre premier projet !
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${color}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }) {
  const statusVariant = {
    active: 'success',
    planning: 'warning',
    on_hold: 'secondary',
    completed: 'default',
    cancelled: 'destructive',
  };

  const statusLabel = {
    active: 'Actif',
    planning: 'Planification',
    on_hold: 'En pause',
    completed: 'Terminé',
    cancelled: 'Annulé',
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{project.name}</CardTitle>
          <Badge variant={statusVariant[project.status] || 'outline'}>
            {statusLabel[project.status] || project.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {project.description || 'Aucune description'}
        </p>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {project.tasks_count !== undefined && (
            <span className="flex items-center gap-1">
              <CheckCircle2 size={14} />
              {project.tasks_count} tâches
            </span>
          )}
          {project.members_count !== undefined && (
            <span className="flex items-center gap-1">
              <Users size={14} />
              {project.members_count} membres
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
