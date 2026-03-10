import { useState } from 'react';
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
  Brain, Clock, AlertTriangle, UserCheck, TrendingUp,
} from 'lucide-react';

/* Manager voit 4 onglets : estimate, risk-task, risk-project, suggest (PAS optimize) */

const TABS = [
  { key: 'estimate', label: 'Estimation', icon: Clock },
  { key: 'risk-task', label: 'Risque Tâche', icon: AlertTriangle },
  { key: 'risk-project', label: 'Risque Projet', icon: TrendingUp },
  { key: 'suggest', label: 'Suggestion', icon: UserCheck },
];

export default function ManagerAiPage() {
  const [tab, setTab] = useState('estimate');

  return (
    <div className="space-y-6">
      <PageHeader title="IA & Analytics" description="Estimations, analyse des risques et suggestions d'assignation" />

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'estimate' && <EstimatePanel />}
      {tab === 'risk-task' && <TaskRiskPanel />}
      {tab === 'risk-project' && <ProjectRiskPanel />}
      {tab === 'suggest' && <SuggestPanel />}
    </div>
  );
}

/* ─── Shared helpers ───────────────────────────── */

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

function ScoreBar({ label, value }) {
  const color = value >= 70 ? 'bg-emerald-500' : value >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-0.5"><span>{label}</span><span>{value}</span></div>
      <div className="h-1.5 w-full rounded-full bg-gray-100"><div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
    </div>
  );
}

/* ─── Panels ──────────────────────────────────── */

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

function ProjectRiskPanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);
  const { data: projects } = useQuery({ queryKey: ['projects-for-ai'], queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data) });
  const { data, isLoading, error } = useQuery({ queryKey: ['ai-risk-project', projectId], queryFn: () => api.get(`/ai/delay-risk/project/${projectId}`).then((r) => r.data), enabled: run && !!projectId });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><TrendingUp className="h-5 w-5 text-orange-500" /> Analyse de risque (Projet)</CardTitle><CardDescription>Risque global de retard d'un projet</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div><label className="mb-1 block text-sm font-medium">Projet</label><Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60"><option value="">Choisir un projet</option>{projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>{isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}Analyser</Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="space-y-4">
            {data.warning && <p className="text-sm text-amber-600 font-medium">⚠️ {data.warning}</p>}
            {data.summary && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard label="Analysées" value={data.summary.total_analyzed} color="text-foreground" />
                <StatCard label="À risque" value={data.summary.at_risk} color="text-amber-600" />
                <StatCard label="Critique" value={data.summary.critical} color="text-red-600" />
                <StatCard label="Élevé" value={data.summary.high} color="text-orange-500" />
                <StatCard label="Moyen" value={data.summary.medium} color="text-yellow-600" />
                <StatCard label="Faible" value={data.summary.low} color="text-green-600" />
              </div>
            )}
            {data.tasks?.length > 0 ? (
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
                    {data.tasks.map((t) => (
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
        )}
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
      <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserCheck className="h-5 w-5 text-green-500" /> Suggestion d'assignation</CardTitle><CardDescription>L'IA suggère le meilleur membre à assigner</CardDescription></CardHeader>
      <CardContent className="space-y-4">
        <TaskSelector taskId={taskId} onTaskChange={(id) => { setTaskId(id); setRun(false); }} onRun={() => setRun(true)} isLoading={isLoading} buttonLabel="Suggérer" buttonIcon={UserCheck} />
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-4">
            <p className="font-medium">{data.title}</p>
            {data.suggestions?.length > 0 && (
              <div className="space-y-3">
                {data.suggestions.map((s, i) => (
                  <div key={s.user_id} className={`rounded-lg bg-white p-4 border ${i === 0 ? 'border-green-300 ring-1 ring-green-200' : 'border-border'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} src={s.avatar} size="sm" className={i === 0 ? 'ring-green-200' : ''} />
                        <div><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-muted-foreground">{s.email}</p></div>
                      </div>
                      <div className="flex items-center gap-2"><Badge variant={i === 0 ? 'success' : 'secondary'}>Score: {s.total}</Badge>{i === 0 && <Badge variant="success">Recommandé</Badge>}</div>
                    </div>
                    {s.scores && <div className="grid grid-cols-2 gap-x-4 gap-y-2"><ScoreBar label="Charge" value={s.scores.workload} /><ScoreBar label="Compétences" value={s.scores.skill_match} /><ScoreBar label="Expérience" value={s.scores.experience} /><ScoreBar label="Disponibilité" value={s.scores.availability} /></div>}
                  </div>
                ))}
              </div>
            )}
            {(!data.suggestions || data.suggestions.length === 0) && data.message && <p className="text-sm text-muted-foreground">{data.message}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
