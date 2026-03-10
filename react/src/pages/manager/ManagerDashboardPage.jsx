import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSpacePrefix } from '../../hooks/useSpacePrefix';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { MetricCard } from '../../components/ui/MetricCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { motion } from 'framer-motion';
import {
  FolderKanban, Users, AlertTriangle, ArrowRight, ListTodo,
  TrendingUp, Flame, Clock, UsersRound, Brain, ShieldAlert, Activity,
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const prefix = useSpacePrefix();

  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data.data),
  });

  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then((r) => r.data.data),
  });

  const { data: tasks } = useQuery({
    queryKey: ['manager-tasks'],
    queryFn: () => api.get('/tasks').then((r) => r.data.tasks).catch(() => []),
  });

  const { data: aiSummary } = useQuery({
    queryKey: ['ai-dashboard-summary'],
    queryFn: () => api.get('/ai/dashboard-summary').then((r) => r.data).catch(() => null),
  });

  const { data: recentActivities } = useQuery({
    queryKey: ['recent-activities'],
    queryFn: () => api.get('/activities/recent?limit=10').then((r) => r.data.activities).catch(() => []),
  });

  if (loadingProjects || loadingTeams) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  const activeProjects = projects?.filter((p) => p.status === 'active') || [];
  const totalProjects = projects?.length || 0;
  const totalTeams = teams?.length || 0;

  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => t.status?.name?.toLowerCase() === 'terminé' || t.status?.name?.toLowerCase() === 'done') || [];
  const overdueTasks = tasks?.filter((t) => {
    if (!t.due_date) return false;
    const isDone = t.status?.name?.toLowerCase() === 'terminé' || t.status?.name?.toLowerCase() === 'done';
    return !isDone && new Date(t.due_date) < new Date();
  }) || [];
  const urgentTasks = tasks?.filter((t) => t.priority === 'urgent' && t.progress_percent < 100) || [];
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Pie data for task statuses
  const statusCounts = {};
  tasks?.forEach((t) => {
    const name = t.status?.name || 'Sans statut';
    statusCounts[name] = (statusCounts[name] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Bonjour, ${user?.name} 👋`}
        description="Vue d'ensemble de vos projets et équipes"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={FolderKanban} label="Projets" value={totalProjects} sub={`${activeProjects.length} actifs`} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={ListTodo} label="Tâches" value={totalTasks} sub={`${completedTasks.length} terminées`} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={AlertTriangle} label="En retard" value={overdueTasks.length} sub={overdueTasks.length > 0 ? 'Action requise' : 'Tout va bien'} color={overdueTasks.length > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} />
        <MetricCard icon={UsersRound} label="Équipes" value={totalTeams} color="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Completion + Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des tâches</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(v, n) => [`${v} tâches`, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune tâche</p>
            )}
          </CardContent>
        </Card>

        {/* Urgent + Overdue */}
        <div className="lg:col-span-2 space-y-4">
          {urgentTasks.length > 0 && (
            <Card className="border-red-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Flame size={15} className="text-red-500" />
                  Tâches urgentes
                  <Badge variant="destructive" className="ml-auto">{urgentTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {urgentTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-lg bg-red-50/50 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground truncate block">{task.title}</span>
                        {task.project && <span className="text-xs text-muted-foreground">{task.project.name}</span>}
                      </div>
                      {task.due_date && (
                        <span className="text-xs text-red-600 flex items-center gap-1 shrink-0 ml-2">
                          <Clock size={11} />
                          {new Date(task.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {overdueTasks.length > 0 && (
            <Card className="border-amber-200/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle size={15} className="text-amber-500" />
                  Tâches en retard
                  <Badge variant="warning" className="ml-auto">{overdueTasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {overdueTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="flex items-center justify-between rounded-lg bg-amber-50/50 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <span className="font-medium text-foreground truncate block">{task.title}</span>
                        {task.project && <span className="text-xs text-muted-foreground">{task.project.name}</span>}
                      </div>
                      <span className="text-xs text-amber-600 flex items-center gap-1 shrink-0 ml-2">
                        <Clock size={11} />
                        {new Date(task.due_date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {urgentTasks.length === 0 && overdueTasks.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Aucune tâche urgente ou en retard</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Risk Overview */}
      {aiSummary && aiSummary.total_analyzed > 0 && (
        <Card className="border-indigo-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain size={15} className="text-indigo-500" />
              Analyse IA des risques
              <Badge variant="outline" className="ml-auto">{aiSummary.total_analyzed} analysées</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-3">
              {aiSummary.critical > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50/60 px-3 py-2">
                  <ShieldAlert size={15} className="text-red-500" />
                  <span className="text-sm font-bold text-red-700">{aiSummary.critical}</span>
                  <span className="text-xs text-red-600">critique{aiSummary.critical > 1 ? 's' : ''}</span>
                </div>
              )}
              {aiSummary.high > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-orange-50/60 px-3 py-2">
                  <AlertTriangle size={15} className="text-orange-500" />
                  <span className="text-sm font-bold text-orange-700">{aiSummary.high}</span>
                  <span className="text-xs text-orange-600">élevé{aiSummary.high > 1 ? 's' : ''}</span>
                </div>
              )}
              {aiSummary.medium > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50/60 px-3 py-2">
                  <AlertTriangle size={15} className="text-amber-500" />
                  <span className="text-sm font-bold text-amber-700">{aiSummary.medium}</span>
                  <span className="text-xs text-amber-600">moyen{aiSummary.medium > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
            {aiSummary.top_risks?.length > 0 && (
              <div className="space-y-1.5">
                {aiSummary.top_risks.map((r) => (
                  <div key={r.task_id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <span className="font-medium text-foreground truncate mr-2">{r.title}</span>
                    <Badge variant={r.risk_level === 'critical' ? 'destructive' : r.risk_level === 'high' ? 'warning' : 'secondary'}>
                      {r.risk_score}%
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activité récente */}
      {recentActivities?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity size={15} className="text-primary" />
              Activité récente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentActivities.map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/40">
                  <Avatar name={a.user?.name || '?'} src={a.user?.avatar} size="xs" className="mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground">
                      <span className="font-medium">{a.user?.name || 'Système'}</span>{' '}
                      <span className="text-muted-foreground">{formatAction(a.action, a.properties)}</span>
                    </p>
                    {a.project && (
                      <Link to={`${prefix}/projects/${a.project.id}`} className="text-xs text-primary hover:underline">
                        {a.project.name}
                      </Link>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{a.human_time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projets récents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Projets récents</h2>
          <Link to={`${prefix}/projects`} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        {projects?.length === 0 ? (
          <EmptyState icon={FolderKanban} title="Aucun projet" description="Créez votre premier projet" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.slice(0, 6).map((project, i) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link to={`${prefix}/projects/${project.id}`}>
                  <Card hover className="cursor-pointer h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm truncate mr-2">{project.name}</CardTitle>
                        <StatusBadge status={project.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description || 'Aucune description'}</p>
                      <ProgressBar value={project.progress_percent || 0} size="sm" showValue className="mb-2" />
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.tasks_count !== undefined && <span className="flex items-center gap-1"><ListTodo size={13} /> {project.tasks_count}</span>}
                        {project.team && <span className="flex items-center gap-1"><Users size={13} /> {project.team.name}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Équipes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Mes équipes</h2>
          <Link to={`${prefix}/teams`} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors">
            Voir tout <ArrowRight size={14} />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams?.slice(0, 6).map((team, i) => (
            <motion.div key={team.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`${prefix}/teams/${team.id}`}>
                <Card hover className="cursor-pointer">
                  <CardContent className="p-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-base font-bold text-primary">
                      {team.name[0]}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{team.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {team.members_count || 0} membres · {team.projects_count || 0} projets
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
          {(!teams || teams.length === 0) && (
            <EmptyState icon={UsersRound} title="Aucune équipe" />
          )}
        </div>
      </div>
    </div>
  );
}

function formatAction(action, props) {
  const labels = {
    project_created: 'a créé le projet',
    task_created: `a créé la tâche « ${props?.task_title || ''} »`,
    task_updated: `a mis à jour la tâche « ${props?.task_title || ''} »`,
    task_deleted: `a supprimé la tâche « ${props?.task_title || ''} »`,
    task_moved: `a déplacé « ${props?.task_title || ''} » → ${props?.new_status || ''}`,
    member_added: `a ajouté ${props?.member_name || 'un membre'}`,
    member_removed: `a retiré ${props?.member_name || 'un membre'}`,
    comment_added: `a commenté « ${props?.task_title || ''} »`,
    time_entry_added: `a enregistré du temps sur « ${props?.task_title || ''} »`,
  };
  return labels[action] || action;
}

function StatusBadge({ status }) {
  const map = {
    active: { label: 'Actif', variant: 'success' },
    planning: { label: 'Planification', variant: 'warning' },
    on_hold: { label: 'En pause', variant: 'secondary' },
    completed: { label: 'Terminé', variant: 'default' },
    cancelled: { label: 'Annulé', variant: 'destructive' },
  };
  const s = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={s.variant} dot>{s.label}</Badge>;
}
