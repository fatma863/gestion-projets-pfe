import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import {
  Brain, Clock, AlertTriangle, UserCheck, TrendingUp, Zap,
} from 'lucide-react';

// Admin voit les 5 onglets IA
const ALL_TABS = [
  { key: 'estimate', label: 'Estimation', icon: Clock },
  { key: 'risk-task', label: 'Risque Tâche', icon: AlertTriangle },
  { key: 'risk-project', label: 'Risque Projet', icon: TrendingUp },
  { key: 'suggest', label: 'Suggestion', icon: UserCheck },
  { key: 'optimize', label: 'Optimisation', icon: Zap },
];

export default function AdminAiPage() {
  const [tab, setTab] = useState('estimate');

  return (
    <div className="space-y-6">
      <PageHeader
        title="IA & Analytics — Administration"
        description="Accès complet à toutes les fonctionnalités IA : estimation, risques, suggestions et optimisation globale"
      />

      <div className="flex gap-1 border-b border-border">
        {ALL_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'estimate' && <EstimatePanel />}
      {tab === 'risk-task' && <TaskRiskPanel />}
      {tab === 'risk-project' && <ProjectRiskPanel />}
      {tab === 'suggest' && <SuggestPanel />}
      {tab === 'optimize' && <OptimizePanel />}
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
      <Button onClick={onRun} disabled={!taskId || isLoading}>
        {isLoading ? <Spinner className="mr-2" /> : <Icon className="mr-2 h-4 w-4" />}{buttonLabel}
      </Button>
    </div>
  );
}

function EstimatePanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['ai-estimate', taskId], queryFn: () => api.get(`/ai/estimate/${taskId}`).then((r) => r.data), enabled: run && !!taskId });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Clock className="h-5 w-5 text-primary" /> Estimation de durée</CardTitle><CardDescription>Estime la durée selon la complexité et l'historique</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <TaskSelector taskId={taskId} onTaskChange={(id) => { setTaskId(id); setRun(false); }} onRun={() => setRun(true)} isLoading={isLoading} buttonLabel="Estimer" buttonIcon={Clock} />
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && <AiResult data={data} />}
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
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-amber-500" /> Risque Tâche</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <TaskSelector taskId={taskId} onTaskChange={(id) => { setTaskId(id); setRun(false); }} onRun={() => setRun(true)} isLoading={isLoading} buttonLabel="Analyser" buttonIcon={AlertTriangle} />
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && <AiResult data={data} />}
      </CardContent>
    </Card>
  );
}

function ProjectRiskPanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);
  const { data: projects } = useQuery({ queryKey: ['projects-for-ai'], queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data) });
  const { data, isLoading, error } = useQuery({ queryKey: ['ai-risk-project', projectId], queryFn: () => api.get(`/ai/delay-risk/project/${projectId}`).then((r) => r.data), enabled: run && !!projectId });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-orange-500" /> Risque Projet</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div><label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60">
              <option value="">Choisir un projet</option>{projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select></div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>{isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}Analyser</Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && <AiResult data={data} />}
      </CardContent>
    </Card>
  );
}

function SuggestPanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);
  const { data, isLoading, error } = useQuery({ queryKey: ['ai-suggest', taskId], queryFn: () => api.get(`/ai/suggest-assignment/${taskId}`).then((r) => r.data), enabled: run && !!taskId });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserCheck className="h-5 w-5 text-green-500" /> Suggestion d'assignation</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <TaskSelector taskId={taskId} onTaskChange={(id) => { setTaskId(id); setRun(false); }} onRun={() => setRun(true)} isLoading={isLoading} buttonLabel="Suggérer" buttonIcon={UserCheck} />
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && <AiResult data={data} />}
      </CardContent>
    </Card>
  );
}

function OptimizePanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);
  const { data: projects } = useQuery({ queryKey: ['projects-for-ai'], queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data) });
  const { data, isLoading, error } = useQuery({ queryKey: ['ai-optimize', projectId], queryFn: () => api.get(`/ai/optimize-assignments/${projectId}`).then((r) => r.data), enabled: run && !!projectId });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Zap className="h-5 w-5 text-purple-500" /> Optimisation globale</CardTitle><CardDescription>Optimise toutes les assignations d'un projet (admin uniquement)</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div><label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60">
              <option value="">Choisir un projet</option>{projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select></div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>{isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}Optimiser</Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && <AiResult data={data} />}
      </CardContent>
    </Card>
  );
}

function AiResult({ data }) {
  // Project risk: { summary, tasks }
  if (data.summary && data.tasks) return <ProjectRiskResult data={data} />;
  // Optimization: { unassigned_count, suggestions }
  if (data.unassigned_count != null && data.suggestions) return <OptimizeResult data={data} />;
  // Task-level results (estimate, task risk, suggestion)
  return <TaskResult data={data} />;
}

function TaskResult({ data }) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border bg-muted/30"><th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Propriété</th><th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Valeur</th></tr></thead>
          <tbody className="divide-y divide-border/50">
            {data.title && <Row label="Tâche" value={data.title} />}
            {data.estimated_hours != null && <Row label="Estimation" value={`${data.estimated_hours} h`} />}
            {data.estimated_days != null && <Row label="Durée estimée" value={`${data.estimated_days} jour(s)`} />}
            {data.confidence != null && <Row label="Confiance" value={`${Math.round(data.confidence * 100)} %`} />}
            {data.method && <Row label="Méthode" value={data.method} />}
            {data.sample_size != null && <Row label="Échantillon" value={`${data.sample_size} tâche(s)`} />}
            {data.comparable_range?.min != null && <Row label="Plage (min)" value={`${data.comparable_range.min} h`} />}
            {data.comparable_range?.max != null && <Row label="Plage (max)" value={`${data.comparable_range.max} h`} />}
            {data.risk_score != null && <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">Score de risque</td><td className="px-4 py-2"><RiskBadge score={data.risk_score} /></td></tr>}
            {data.risk_level && <Row label="Niveau" value={{ critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' }[data.risk_level] || data.risk_level} />}
          </tbody>
        </table>
      </div>
      {data.risk_factors?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Facteurs de risque</h4>
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
          <h4 className="text-sm font-semibold">Recommandations</h4>
          {data.recommendations.map((r, i) => <p key={i} className="rounded-lg border border-border bg-blue-50 p-3 text-sm text-blue-800">💡 {r}</p>)}
        </div>
      )}
      {data.best_match && (
        <div className="rounded-lg border border-border bg-green-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-green-800">Meilleur candidat</h4>
          <div className="flex items-center gap-3">
            <Avatar name={data.best_match.name} src={data.best_match.avatar} size="sm" />
            <span className="font-medium text-green-900">{data.best_match.name}</span>
            {data.best_match.total != null && <Badge variant="outline">Score: {data.best_match.total}</Badge>}
            {data.confidence != null && <Badge variant="secondary">Confiance: {Math.round(data.confidence * 100)}%</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectRiskResult({ data }) {
  const { summary, tasks } = data;
  return (
    <div className="space-y-4">
      {data.warning && <p className="text-sm text-amber-600 font-medium">⚠️ {data.warning}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Analysées" value={summary.total_analyzed} color="text-foreground" />
        <StatCard label="À risque" value={summary.at_risk} color="text-amber-600" />
        <StatCard label="Critique" value={summary.critical} color="text-red-600" />
        <StatCard label="Élevé" value={summary.high} color="text-orange-500" />
        <StatCard label="Moyen" value={summary.medium} color="text-yellow-600" />
        <StatCard label="Faible" value={summary.low} color="text-green-600" />
      </div>
      {tasks.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Tâche</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Priorité</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Échéance</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Progression</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Risque</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Facteurs</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {tasks.map((t) => (
                <tr key={t.task_id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{t.title}</td>
                  <td className="px-4 py-2"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-2 text-muted-foreground">{t.due_date || '—'}</td>
                  <td className="px-4 py-2">{t.progress}%</td>
                  <td className="px-4 py-2"><RiskBadge score={t.risk_score} /></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{t.risk_factors?.map((f) => f.detail).join(' · ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucune tâche à risque détectée — tout est en bonne voie 🎉</p>
      )}
    </div>
  );
}

function OptimizeResult({ data }) {
  return (
    <div className="space-y-4">
      {data.warning && <p className="text-sm text-amber-600 font-medium">⚠️ {data.warning}</p>}
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-border bg-purple-50 px-4 py-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{data.unassigned_count}</p>
          <p className="text-xs text-purple-600">Tâches non assignées</p>
        </div>
      </div>
      {data.suggestions.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Tâche</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Priorité</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Complexité</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Candidat suggéré</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Score</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Confiance</th>
            </tr></thead>
            <tbody className="divide-y divide-border/50">
              {data.suggestions.map((s) => (
                <tr key={s.task_id} className="hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{s.title}</td>
                  <td className="px-4 py-2"><PriorityBadge priority={s.priority} /></td>
                  <td className="px-4 py-2">{s.complexity ?? '—'}/10</td>
                  <td className="px-4 py-2 font-medium">
                    <div className="flex items-center gap-2">
                      {s.best_match?.name ? <Avatar name={s.best_match.name} src={s.best_match.avatar} size="xs" /> : null}
                      {s.best_match?.name || '—'}
                    </div>
                  </td>
                  <td className="px-4 py-2">{s.best_match?.total != null ? s.best_match.total : '—'}</td>
                  <td className="px-4 py-2">{s.confidence != null ? `${Math.round(s.confidence * 100)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted-foreground">Toutes les tâches sont déjà assignées 👍</p>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return <tr className="hover:bg-muted/20"><td className="px-4 py-2 text-muted-foreground">{label}</td><td className="px-4 py-2 font-medium">{value}</td></tr>;
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const map = { critical: ['Critique', 'destructive'], high: ['Haute', 'warning'], medium: ['Moyenne', 'secondary'], low: ['Basse', 'outline'] };
  const [label, variant] = map[priority] || [priority || '—', 'outline'];
  return <Badge variant={variant}>{label}</Badge>;
}

function RiskBadge({ score }) {
  const variant = score >= 70 ? 'destructive' : score >= 40 ? 'warning' : 'success';
  const label = score >= 70 ? 'Élevé' : score >= 40 ? 'Moyen' : 'Faible';
  return <Badge variant={variant}>{score}% — {label}</Badge>;
}
