import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { MetricCard } from '../../components/ui/MetricCard';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { PageHeader } from '../../components/ui/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RTooltip } from 'recharts';
import {
  Users,
  FolderKanban,
  ListTodo,
  UsersRound,
  AlertTriangle,
  TrendingUp,
  Brain,
  ShieldAlert,
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const PRIORITY_COLORS = { urgent: '#ef4444', high: '#f59e0b', medium: '#6366f1', low: '#10b981' };

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data),
  });

  const { data: aiSummary } = useQuery({
    queryKey: ['ai-dashboard-summary'],
    queryFn: () => api.get('/ai/dashboard-summary').then((r) => r.data).catch(() => null),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  const completionRate = stats?.total_tasks > 0
    ? Math.round((stats.completed_tasks / stats.total_tasks) * 100)
    : 0;

  // Chart data
  const roleData = stats?.users_by_role
    ? Object.entries(stats.users_by_role).map(([name, value]) => ({ name, value }))
    : [];
  const statusData = stats?.projects_by_status
    ? Object.entries(stats.projects_by_status).map(([name, value]) => ({ name, value }))
    : [];
  const priorityData = stats?.tasks_by_priority
    ? Object.entries(stats.tasks_by_priority).map(([name, value]) => ({ name, value, fill: PRIORITY_COLORS[name] || '#94a3b8' }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administration"
        description="Vue globale de la plateforme"
      />

      {/* Statistiques principales */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Users} label="Utilisateurs" value={stats?.total_users ?? 0} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={UsersRound} label="Équipes" value={stats?.total_teams ?? 0} color="bg-green-50 text-green-600" />
        <MetricCard icon={FolderKanban} label="Projets" value={stats?.total_projects ?? 0} sub={`${stats?.overdue_projects ?? 0} en retard`} color="bg-purple-50 text-purple-600" />
        <MetricCard icon={ListTodo} label="Tâches" value={stats?.total_tasks ?? 0} sub={`${stats?.completed_tasks ?? 0} terminées`} color="bg-amber-50 text-amber-600" />
      </div>

      {/* KPIs row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Taux de complétion</p>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground mb-2">{completionRate}%</p>
            <ProgressBar value={completionRate} size="md" />
          </CardContent>
        </Card>
        <Card className={stats?.overdue_projects > 0 ? 'border-red-200/50' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Projets en retard</p>
              <AlertTriangle size={16} className={stats?.overdue_projects > 0 ? 'text-red-500' : 'text-emerald-500'} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.overdue_projects ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">sur {stats?.total_projects ?? 0} projets</p>
          </CardContent>
        </Card>
        <Card className={stats?.overdue_tasks > 0 ? 'border-amber-200/50' : ''}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Tâches en retard</p>
              <AlertTriangle size={16} className={stats?.overdue_tasks > 0 ? 'text-amber-500' : 'text-emerald-500'} />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.overdue_tasks ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">sur {stats?.total_tasks ?? 0} tâches</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Utilisateurs par rôle - Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs par rôle</CardTitle>
          </CardHeader>
          <CardContent>
            {roleData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {roleData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 justify-center mt-2">
                  {roleData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Tâches par priorité - Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Tâches par priorité</CardTitle>
          </CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <RTooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        {/* Projets par statut */}
        <Card>
          <CardHeader>
            <CardTitle>Projets par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statusData.map((d, i) => {
                const total = statusData.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
                return (
                  <div key={d.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground capitalize">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{d.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Utilisateurs récents */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers inscrits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(stats?.recent_users || []).map((u) => (
                <div key={u.id} className="flex items-center gap-3 text-sm">
                  <Avatar name={u.name} src={u.avatar} size="sm" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground block truncate">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{u.email}</span>
                  </div>
                  <Badge variant="outline">{u.role}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Risk Overview */}
      {aiSummary && aiSummary.total_analyzed > 0 && (
        <Card className="border-indigo-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Brain size={16} className="text-indigo-500" />
              Analyse IA des risques
              <Badge variant="outline" className="ml-auto">{aiSummary.total_analyzed} tâches analysées</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 mb-4">
              <div className="flex items-center gap-3 rounded-lg bg-red-50/60 p-3">
                <ShieldAlert size={18} className="text-red-500 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-red-700">{aiSummary.critical}</p>
                  <p className="text-xs text-red-600">Critique</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-orange-50/60 p-3">
                <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-orange-700">{aiSummary.high}</p>
                  <p className="text-xs text-orange-600">Élevé</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-amber-50/60 p-3">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-xl font-bold text-amber-700">{aiSummary.medium}</p>
                  <p className="text-xs text-amber-600">Moyen</p>
                </div>
              </div>
            </div>
            {aiSummary.top_risks?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Tâches les plus à risque</p>
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
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
