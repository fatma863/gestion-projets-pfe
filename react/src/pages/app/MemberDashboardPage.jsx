import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { MetricCard } from '../../components/ui/MetricCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import { motion } from 'framer-motion';
import { Avatar } from '../../components/ui/Avatar';
import {
  FolderKanban, CheckCircle2, AlertTriangle, TrendingUp, Users,
  ArrowRight, ListTodo, Clock, Brain, ShieldAlert, Activity,
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_LABELS = { active: 'Actif', planning: 'Planification', on_hold: 'En pause', completed: 'Terminé', cancelled: 'Annulé' };
const STATUS_VARIANTS = { active: 'success', planning: 'warning', on_hold: 'secondary', completed: 'default', cancelled: 'destructive' };

export default function MemberDashboardPage() {
  const { user } = useAuth();

  const { data: projects, isLoading } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then((r) => r.data.data) });
  const { data: tasks } = useQuery({ queryKey: ['dashboard-tasks'], queryFn: () => api.get('/tasks').then((r) => r.data.tasks).catch(() => []) });
  const { data: aiSummary } = useQuery({ queryKey: ['ai-dashboard-summary'], queryFn: () => api.get('/ai/dashboard-summary').then((r) => r.data).catch(() => null) });
  const { data: recentActivities } = useQuery({ queryKey: ['recent-activities'], queryFn: () => api.get('/activities/recent?limit=10').then((r) => r.data.activities).catch(() => []) });

  if (isLoading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;

  const activeProjects = projects?.filter((p) => p.status === 'active') || [];
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((t) => ['done', 'terminé'].includes(t.status?.name?.toLowerCase())) || [];
  const overdueTasks = tasks?.filter((t) => {
    const isDone = ['done', 'terminé'].includes(t.status?.name?.toLowerCase());
    return !isDone && t.due_date && new Date(t.due_date) < new Date();
  }) || [];
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const statusCounts = {};
  tasks?.forEach((t) => { const name = t.status?.name || 'Sans statut'; statusCounts[name] = (statusCounts[name] || 0) + 1; });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <PageHeader title={`Bonjour, ${user?.name} 👋`} description="Vue d'ensemble de vos projets et tâches" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={FolderKanban} label="Projets" value={projects?.length || 0} sub={`${activeProjects.length} actifs`} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={ListTodo} label="Tâches" value={totalTasks} sub={`${completedTasks.length} terminées`} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={AlertTriangle} label="En retard" value={overdueTasks.length} sub={overdueTasks.length > 0 ? 'Action requise' : 'Tout va bien'} color={overdueTasks.length > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} />
        <MetricCard icon={TrendingUp} label="Complétion" value={`${completionRate}%`} sub="de vos tâches" color="bg-purple-50 text-purple-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {pieData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Répartition des tâches</CardTitle></CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">{pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><RTooltip formatter={(v, n) => [`${v} tâches`, n]} /></PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 justify-center">
                {pieData.map((d, i) => <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground"><div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />{d.name} ({d.value})</div>)}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className={overdueTasks.length > 0 ? 'lg:col-span-2 border-red-200/50' : 'lg:col-span-2'}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle size={16} className={overdueTasks.length > 0 ? 'text-red-500' : 'text-muted-foreground'} /> Tâches en retard
              {overdueTasks.length > 0 && <Badge variant="destructive" className="ml-auto">{overdueTasks.length}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Aucune tâche en retard</p>
            ) : (
              <div className="space-y-2">
                {overdueTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between rounded-lg bg-red-50/50 px-3 py-2.5 text-sm">
                    <span className="font-medium text-foreground">{task.title}</span>
                    <span className="text-xs text-red-600 flex items-center gap-1"><Clock size={12} />{new Date(task.due_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Risk Overview */}
      {aiSummary && aiSummary.total_analyzed > 0 && (
        <Card className="border-indigo-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Brain size={15} className="text-indigo-500" />
              Risques IA sur vos tâches
              {(aiSummary.critical > 0 || aiSummary.high > 0) && (
                <Badge variant="destructive" className="ml-auto">{aiSummary.critical + aiSummary.high} à risque</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiSummary.top_risks?.length > 0 ? (
              <div className="space-y-1.5">
                {aiSummary.top_risks.map((r) => (
                  <div key={r.task_id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {r.risk_level === 'critical' && <ShieldAlert size={14} className="text-red-500 shrink-0" />}
                      {r.risk_level === 'high' && <AlertTriangle size={14} className="text-orange-500 shrink-0" />}
                      {r.risk_level === 'medium' && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                      <span className="font-medium text-foreground truncate">{r.title}</span>
                    </div>
                    <Badge variant={r.risk_level === 'critical' ? 'destructive' : r.risk_level === 'high' ? 'warning' : 'secondary'}>
                      {r.risk_score}%
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">Aucune tâche à risque détectée</p>
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
                      <Link to={`/app/projects/${a.project.id}`} className="text-xs text-primary hover:underline">
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">Mes projets</h2>
          <Link to="/app/projects" className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium transition-colors">Voir tout <ArrowRight size={14} /></Link>
        </div>
        {projects?.length === 0 ? (
          <EmptyState icon={FolderKanban} title="Aucun projet" description="Vous n'êtes assigné à aucun projet pour le moment" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects?.slice(0, 6).map((project, i) => (
              <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.05 }}>
                <Link to={`/app/projects/${project.id}`}>
                  <Card hover className="cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between"><CardTitle className="text-sm truncate mr-2">{project.name}</CardTitle><Badge variant={STATUS_VARIANTS[project.status] || 'outline'} dot>{STATUS_LABELS[project.status] || project.status}</Badge></div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description || 'Aucune description'}</p>
                      <ProgressBar value={project.progress_percent || 0} size="sm" showValue className="mb-3" />
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {project.tasks_count !== undefined && <span className="flex items-center gap-1"><CheckCircle2 size={13} />{project.tasks_count} tâches</span>}
                        {project.members_count !== undefined && <span className="flex items-center gap-1"><Users size={13} />{project.members_count} membres</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
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
