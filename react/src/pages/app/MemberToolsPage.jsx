import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Avatar } from '../../components/ui/Avatar';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';
import {
  Wrench, FolderKanban, Users, ListTodo, Clock,
  FileText, BookOpen, Link2, CheckCircle2,
} from 'lucide-react';

const STATUS_LABELS = { planning: 'Planification', active: 'Actif', on_hold: 'En pause', completed: 'Terminé', cancelled: 'Annulé' };
const STATUS_VARIANTS = { planning: 'secondary', active: 'success', on_hold: 'warning', completed: 'default', cancelled: 'destructive' };

export default function MemberToolsPage() {
  const [tab, setTab] = useState('overview');

  const { data: projects, isLoading: loadProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then((r) => r.data.data),
  });
  const { data: tasks } = useQuery({
    queryKey: ['my-tasks-tools'],
    queryFn: () => api.get('/tasks').then((r) => r.data.tasks).catch(() => []),
  });
  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams').then((r) => r.data.data).catch(() => []),
  });

  if (loadProjects) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;

  const totalTasks = tasks?.length || 0;
  const doneTasks = tasks?.filter((t) => ['done', 'terminé'].includes(t.status?.name?.toLowerCase())).length || 0;
  const inProgressTasks = tasks?.filter((t) => {
    const name = t.status?.name?.toLowerCase() || '';
    return !['done', 'terminé'].includes(name) && name !== 'à faire' && name !== 'todo';
  }).length || 0;

  // Time tracking summary
  const totalHoursLogged = tasks?.reduce((sum, t) => sum + (t.time_entries_sum || 0), 0) || 0;
  const totalEstimated = tasks?.reduce((sum, t) => sum + (t.estimated_hours || 0), 0) || 0;

  const TABS = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: Wrench },
    { key: 'resources', label: 'Ressources', icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Outils" description="Ressources, documentation et vue d'ensemble de votre travail" />

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Work summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard icon={ListTodo} label="Tâches totales" value={totalTasks} sub={`${doneTasks} terminées`} color="bg-blue-50 text-blue-600" />
            <SummaryCard icon={Clock} label="En cours" value={inProgressTasks} color="bg-amber-50 text-amber-600" />
            <SummaryCard icon={CheckCircle2} label="Terminées" value={doneTasks} sub={totalTasks > 0 ? `${Math.round((doneTasks / totalTasks) * 100)}%` : '0%'} color="bg-emerald-50 text-emerald-600" />
            <SummaryCard icon={FolderKanban} label="Projets" value={projects?.length || 0} color="bg-indigo-50 text-indigo-600" />
          </div>

          {/* My projects quick access */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanban className="h-4 w-4 text-primary" /> Accès rapide aux projets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!projects?.length ? (
                <EmptyState icon={FolderKanban} title="Aucun projet" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {projects.map((p, i) => (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Link to={`/app/projects/${p.id}`}>
                        <div className="flex items-center gap-3 rounded-lg border border-border p-3 transition-all hover:shadow-sm hover:border-primary/30 cursor-pointer">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">{p.code?.[0] || p.name[0]}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant={STATUS_VARIANTS[p.status] || 'outline'} className="text-[10px]">{STATUS_LABELS[p.status] || p.status}</Badge>
                              <span className="text-[10px] text-muted-foreground">{p.tasks_count || 0} tâches</span>
                            </div>
                          </div>
                          <ProgressBar value={p.progress_percent || 0} size="sm" className="w-14" />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* My teams */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" /> Mes équipes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!teams?.length ? (
                <EmptyState icon={Users} title="Aucune équipe" />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {teams.map((t) => (
                    <Link key={t.id} to={`/app/teams/${t.id}`}>
                      <div className="flex items-center gap-3 rounded-lg border border-border p-3 hover:shadow-sm transition-all cursor-pointer">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 text-sm font-bold text-indigo-600">{t.name[0]}</div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.members_count || 0} membres · {t.projects_count || 0} projets</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'resources' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" /> Documentation & Ressources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ResourceLink icon={FileText} title="Gestion de projet" description="Bonnes pratiques pour la gestion de projets agile" />
              <ResourceLink icon={ListTodo} title="Guide des tâches" description="Comment créer, assigner et suivre les tâches efficacement" />
              <ResourceLink icon={Users} title="Collaboration d'équipe" description="Outils et méthodes pour travailler en équipe" />
              <ResourceLink icon={Link2} title="Raccourcis clavier" description="Utilisez ⌘K pour la recherche rapide, et les raccourcis Kanban" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="h-4 w-4 text-primary" /> Liens utiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink icon={FolderKanban} label="Mes projets" to="/app/projects" />
                <QuickLink icon={ListTodo} label="Mes tâches" to="/app/my-tasks" />
                <QuickLink icon={Clock} label="Gantt" to="/app/gantt" />
                <QuickLink icon={Users} label="Mes équipes" to="/app/teams" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, sub, color }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}{sub ? ` · ${sub}` : ''}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceLink({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function QuickLink({ icon: Icon, label, to }) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-accent/50 hover:border-primary/30 transition-all">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}
