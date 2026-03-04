import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
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
  ArrowRight,
  ListTodo,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data.data),
  });

  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data.data).catch(() => []),
  });

  if (loadingProjects) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const activeProjects = projects?.filter((p) => p.status === 'active') || [];
  const completedProjects = projects?.filter((p) => p.status === 'completed') || [];
  const totalProjects = projects?.length || 0;

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status?.name?.toLowerCase() === 'done' || t.status?.name?.toLowerCase() === 'terminé') || [];
  const overdueTasks = tasks?.filter((t) => {
    if (!t.due_date) return false;
    const isDone = t.status?.name?.toLowerCase() === 'done' || t.status?.name?.toLowerCase() === 'terminé';
    return !isDone && new Date(t.due_date) < new Date();
  }) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bonjour, {user?.name} 👋
        </h1>
        <p className="text-muted-foreground">
          Voici un aperçu de vos projets et tâches
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderKanban}
          label="Projets totaux"
          value={totalProjects}
          sub={`${activeProjects.length} actifs`}
          color="text-blue-600 bg-blue-50"
        />
        <StatCard
          icon={ListTodo}
          label="Tâches totales"
          value={totalTasks}
          sub={`${completedTasks.length} terminées`}
          color="text-emerald-600 bg-emerald-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="En retard"
          value={overdueTasks.length}
          sub={overdueTasks.length > 0 ? 'Action requise' : 'Tout va bien'}
          color={overdueTasks.length > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}
        />
        <StatCard
          icon={TrendingUp}
          label="Taux de complétion"
          value={totalTasks > 0 ? `${Math.round((completedTasks.length / totalTasks) * 100)}%` : '—'}
          sub={`${completedProjects.length} projets terminés`}
          color="text-purple-600 bg-purple-50"
        />
      </div>

      {/* Overdue tasks */}
      {overdueTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={18} /> Tâches en retard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">{task.title}</span>
                  <span className="text-xs text-red-600">
                    Échéance : {new Date(task.due_date).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              ))}
              {overdueTasks.length > 5 && (
                <p className="text-xs text-red-600 mt-1">+ {overdueTasks.length - 5} autres tâches en retard</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projects list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Mes projets</h2>
          <Link to="/projects" className="flex items-center gap-1 text-sm text-primary hover:underline">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        {projects?.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucun projet trouvé. Créez votre premier projet !
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${color}`}>
          <Icon size={24} />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
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

  const progress = project.progress_percent || 0;

  return (
    <Link to={`/projects/${project.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base truncate mr-2">{project.name}</CardTitle>
            <Badge variant={statusVariant[project.status] || 'outline'}>
              {statusLabel[project.status] || project.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.description || 'Aucune description'}
          </p>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Progression</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
    </Link>
  );
}
