import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { PageHeader } from '../../components/ui/PageHeader';
import { Brain, Clock, AlertTriangle, BarChart3, ListTodo, TrendingUp, Target } from 'lucide-react';

/* Member voit 3 onglets : estimate + risk-task + workload */

const TABS = [
  { key: 'estimate', label: 'Estimation', icon: Clock },
  { key: 'risk-task', label: 'Risque Tâche', icon: AlertTriangle },
  { key: 'workload', label: 'Charge de travail', icon: BarChart3 },
];

export default function MemberAiPage() {
  const [tab, setTab] = useState('estimate');

  return (
    <div className="space-y-6">
      <PageHeader title="IA & Analytics" description="Estimations de durée et analyse des risques sur vos tâches" />

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'estimate' && <EstimatePanel />}
      {tab === 'risk-task' && <TaskRiskPanel />}
      {tab === 'workload' && <WorkloadPanel />}
    </div>
  );
}

function TaskSelector({ taskId, onTaskChange, onRun, isLoading, buttonLabel = 'Analyser', buttonIcon: Icon = Brain }) {
  const [projectId, setProjectId] = useState('');
  const { data: projects } = useQuery({ queryKey: ['projects-for-ai'], queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data) });
  const { data: tasks } = useQuery({ queryKey: ['tasks-for-ai', projectId], queryFn: () => api.get(`/projects/${projectId}/tasks?all=1`).then((r) => r.data.tasks ?? r.data.data ?? r.data), enabled: !!projectId });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">Projet</label>
        <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); onTaskChange(''); }} className="w-60">
          <option value="">Choisir un projet</option>
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Tâche</label>
        <Select value={taskId} onChange={(e) => onTaskChange(e.target.value)} className="w-72" disabled={!projectId}>
          <option value="">Choisir une tâche</option>
          {(tasks || []).map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </Select>
      </div>
      <Button onClick={onRun} disabled={!taskId || isLoading}>{isLoading ? <Spinner className="mr-2" /> : <Icon className="mr-2 h-4 w-4" />}{buttonLabel}</Button>
    </div>
  );
}

function RiskBadge({ score }) {
  const variant = score >= 70 ? 'destructive' : score >= 40 ? 'warning' : 'success';
  const label = score >= 70 ? 'Élevé' : score >= 40 ? 'Moyen' : 'Faible';
  return <Badge variant={variant}>{score}% — {label}</Badge>;
}

function EstimatePanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['ai-estimate', taskId], queryFn: () => api.get(`/ai/estimate/${taskId}`).then((r) => r.data), enabled: run && !!taskId });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-primary" /> Estimation de durée</CardTitle><CardDescription>Estimation IA de la durée d'une tâche</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <TaskSelector taskId={taskId} onTaskChange={(id) => { setTaskId(id); setRun(false); }} onRun={() => setRun(true)} isLoading={isLoading} buttonLabel="Estimer" buttonIcon={Clock} />
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="overflow-x-auto rounded-lg border border-border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Propriété</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.task_id != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">ID Tâche</td><td className="px-4 py-2 font-medium">{data.task_id}</td></tr>}
                {data.title && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Titre</td><td className="px-4 py-2 font-medium">{data.title}</td></tr>}
                {data.estimated_hours != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Estimation</td><td className="px-4 py-2 font-medium">{data.estimated_hours} h</td></tr>}
                {data.estimated_days != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Durée estimée</td><td className="px-4 py-2 font-medium">{data.estimated_days} jour(s)</td></tr>}
                {data.confidence != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Confiance</td><td className="px-4 py-2 font-medium">{Math.round(data.confidence * 100)} %</td></tr>}
                {data.method && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Méthode</td><td className="px-4 py-2 font-medium">{data.method}</td></tr>}
                {data.sample_size != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Échantillon</td><td className="px-4 py-2 font-medium">{data.sample_size} tâche(s)</td></tr>}
                {data.comparable_range?.min != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Plage comparable (min)</td><td className="px-4 py-2 font-medium">{data.comparable_range.min} h</td></tr>}
                {data.comparable_range?.max != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Plage comparable (max)</td><td className="px-4 py-2 font-medium">{data.comparable_range.max} h</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRiskPanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['ai-risk-task', taskId], queryFn: () => api.get(`/ai/delay-risk/task/${taskId}`).then((r) => r.data), enabled: run && !!taskId });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-amber-500" /> Analyse de risque (Tâche)</CardTitle><CardDescription>Évalue le risque de retard d'une tâche</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <TaskSelector taskId={taskId} onTaskChange={(id) => { setTaskId(id); setRun(false); }} onRun={() => setRun(true)} isLoading={isLoading} buttonLabel="Analyser" buttonIcon={AlertTriangle} />
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            <p className="font-medium">{data.title}</p>
            {data.risk_score != null && <div className="flex items-center gap-2"><span className="text-sm">Score:</span><RiskBadge score={data.risk_score} /></div>}
            {data.risk_level && <p className="text-sm">Niveau : <span className="font-medium">{{ critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' }[data.risk_level] || data.risk_level}</span></p>}
            {data.risk_factors?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Facteurs de risque</p>
                {data.risk_factors.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-white p-3 text-sm">
                    <Badge variant={f.impact === 'critical' ? 'destructive' : f.impact === 'high' ? 'warning' : 'secondary'} className="mt-0.5 shrink-0">{{ critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' }[f.impact] || f.impact}</Badge>
                    <span>{f.detail}</span>
                  </div>
                ))}
              </div>
            )}
            {data.recommendations?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Recommandations</p>
                {data.recommendations.map((r, i) => <p key={i} className="rounded-lg border border-border bg-blue-50 p-3 text-sm text-blue-800">💡 {r}</p>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkloadPanel() {
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks-workload'],
    queryFn: () => api.get('/tasks').then((r) => r.data.tasks).catch(() => []),
  });
  const { data: aiSummary } = useQuery({
    queryKey: ['ai-dashboard-summary-workload'],
    queryFn: () => api.get('/ai/dashboard-summary').then((r) => r.data).catch(() => null),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  const allTasks = tasks || [];
  const totalTasks = allTasks.length;
  const doneTasks = allTasks.filter((t) => ['done', 'terminé'].includes(t.status?.name?.toLowerCase()));
  const inProgressTasks = allTasks.filter((t) => {
    const name = t.status?.name?.toLowerCase() || '';
    return !['done', 'terminé'].includes(name) && name !== 'à faire' && name !== 'todo';
  });
  const overdueTasks = allTasks.filter((t) => {
    const isDone = ['done', 'terminé'].includes(t.status?.name?.toLowerCase());
    return !isDone && t.due_date && new Date(t.due_date) < new Date();
  });
  const urgentTasks = allTasks.filter((t) => t.priority === 'urgent' && !['done', 'terminé'].includes(t.status?.name?.toLowerCase()));
  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  const totalEstimated = allTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
  const avgProgress = totalTasks > 0 ? Math.round(allTasks.reduce((sum, t) => sum + (t.progress_percent || 0), 0) / totalTasks) : 0;

  // Productivity suggestions
  const suggestions = [];
  if (overdueTasks.length > 0) suggestions.push(`Vous avez ${overdueTasks.length} tâche(s) en retard. Priorisez-les ou ajustez les échéances.`);
  if (urgentTasks.length > 2) suggestions.push(`${urgentTasks.length} tâches urgentes en cours. Envisagez de déléguer si possible.`);
  if (inProgressTasks.length > 5) suggestions.push(`Vous avez ${inProgressTasks.length} tâches en cours simultanément. Concentrez-vous sur 2-3 tâches maximum pour plus d'efficacité.`);
  if (completionRate > 70) suggestions.push('Excellent taux de complétion ! Continuez ainsi.');
  if (completionRate < 30 && totalTasks > 5) suggestions.push('Votre taux de complétion est bas. Essayez de terminer les tâches les plus simples en premier.');
  if (totalEstimated > 40) suggestions.push(`${totalEstimated}h estimées au total. Vérifiez les ressources allouées avec votre manager.`);
  if (suggestions.length === 0) suggestions.push('Bonne charge de travail ! Aucun problème détecté.');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" /> Analyse de charge
          </CardTitle>
          <CardDescription>Vue d'ensemble de votre charge de travail et recommandations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border p-3 text-center">
              <ListTodo className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-bold">{totalTasks}</p>
              <p className="text-xs text-muted-foreground">Tâches totales</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <TrendingUp className="mx-auto h-5 w-5 text-emerald-600 mb-1" />
              <p className="text-2xl font-bold">{completionRate}%</p>
              <p className="text-xs text-muted-foreground">Complétion</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <Target className="mx-auto h-5 w-5 text-amber-600 mb-1" />
              <p className="text-2xl font-bold">{inProgressTasks.length}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <AlertTriangle className="mx-auto h-5 w-5 text-red-500 mb-1" />
              <p className="text-2xl font-bold">{overdueTasks.length}</p>
              <p className="text-xs text-muted-foreground">En retard</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Progression globale</p>
            <ProgressBar value={avgProgress} showValue size="md" />
          </div>

          {totalEstimated > 0 && (
            <p className="text-sm text-muted-foreground">
              <Clock className="inline h-3.5 w-3.5 mr-1" /> Heures estimées restantes : <span className="font-medium text-foreground">{totalEstimated}h</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-indigo-500" /> Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-blue-50/60 p-3 text-sm text-blue-800">
              💡 {s}
            </div>
          ))}
          {aiSummary?.top_risks?.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold mb-2">Tâches à risque identifiées par l'IA</p>
              {aiSummary.top_risks.map((r) => (
                <div key={r.task_id} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm mb-1">
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
    </div>
  );
}
