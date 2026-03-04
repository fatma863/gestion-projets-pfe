import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import {
  Brain, Clock, AlertTriangle, UserCheck, TrendingUp, Zap,
} from 'lucide-react';

export default function AiPage() {
  const [tab, setTab] = useState('estimate');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">IA & Analytics</h1>
        <p className="text-muted-foreground">Estimations intelligentes, analyse des risques et optimisation</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'estimate', label: 'Estimation', icon: Clock },
          { key: 'risk-task', label: 'Risque Tâche', icon: AlertTriangle },
          { key: 'risk-project', label: 'Risque Projet', icon: TrendingUp },
          { key: 'suggest', label: 'Suggestion', icon: UserCheck },
          { key: 'optimize', label: 'Optimisation', icon: Zap },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
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

function EstimatePanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-estimate', taskId],
    queryFn: () => api.get(`/ai/estimate/${taskId}`).then((r) => r.data),
    enabled: run && !!taskId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5 text-primary" /> Estimation de durée
        </CardTitle>
        <CardDescription>L'IA estime la durée d'une tâche selon sa complexité et priorité</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">ID de la tâche</label>
            <Input type="number" value={taskId} onChange={(e) => { setTaskId(e.target.value); setRun(false); }} placeholder="Ex: 1" className="w-32" />
          </div>
          <Button onClick={() => setRun(true)} disabled={!taskId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Estimer
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            <p className="font-medium">{data.title}</p>
            {data.estimated_hours != null && (
              <div className="flex items-center gap-2">
                <Badge variant="success">Estimation: {data.estimated_hours}h</Badge>
              </div>
            )}
            {data.confidence && <p className="text-sm text-muted-foreground">Confiance: {data.confidence}</p>}
            {data.strategy && <p className="text-sm text-muted-foreground">Stratégie: {data.strategy}</p>}
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TaskRiskPanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-risk-task', taskId],
    queryFn: () => api.get(`/ai/delay-risk/task/${taskId}`).then((r) => r.data),
    enabled: run && !!taskId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Analyse de risque (Tâche)
        </CardTitle>
        <CardDescription>Évalue le risque de retard d'une tâche spécifique</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">ID de la tâche</label>
            <Input type="number" value={taskId} onChange={(e) => { setTaskId(e.target.value); setRun(false); }} placeholder="Ex: 1" className="w-32" />
          </div>
          <Button onClick={() => setRun(true)} disabled={!taskId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            <p className="font-medium">{data.title}</p>
            {data.risk_score != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Score de risque:</span>
                <RiskBadge score={data.risk_score} />
              </div>
            )}
            {data.risk_level && <Badge variant={data.risk_level === 'high' ? 'destructive' : data.risk_level === 'medium' ? 'warning' : 'success'}>{data.risk_level}</Badge>}
            {data.factors && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Facteurs de risque:</p>
                {Object.entries(data.factors).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="font-medium">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                  </div>
                ))}
              </div>
            )}
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectRiskPanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-ai'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-risk-project', projectId],
    queryFn: () => api.get(`/ai/delay-risk/project/${projectId}`).then((r) => r.data),
    enabled: run && !!projectId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-orange-500" /> Analyse de risque (Projet)
        </CardTitle>
        <CardDescription>Évalue le risque global de retard d'un projet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Analyser
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            {data.risk_score != null && (
              <div className="flex items-center gap-2">
                <span className="text-sm">Score de risque global:</span>
                <RiskBadge score={data.risk_score} />
              </div>
            )}
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SuggestPanel() {
  const [taskId, setTaskId] = useState('');
  const [run, setRun] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-suggest', taskId],
    queryFn: () => api.get(`/ai/suggest-assignment/${taskId}`).then((r) => r.data),
    enabled: run && !!taskId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserCheck className="h-5 w-5 text-green-500" /> Suggestion d'assignation
        </CardTitle>
        <CardDescription>L'IA suggère le meilleur membre à assigner à une tâche</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">ID de la tâche</label>
            <Input type="number" value={taskId} onChange={(e) => { setTaskId(e.target.value); setRun(false); }} placeholder="Ex: 1" className="w-32" />
          </div>
          <Button onClick={() => setRun(true)} disabled={!taskId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Suggérer
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            <p className="font-medium">{data.title}</p>
            {data.suggested_user && (
              <div className="flex items-center gap-3 rounded-lg bg-white p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold">
                  {data.suggested_user.name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-medium">{data.suggested_user.name}</p>
                  <p className="text-sm text-muted-foreground">{data.suggested_user.email}</p>
                </div>
                {data.score && <Badge variant="success">Score: {data.score}</Badge>}
              </div>
            )}
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OptimizePanel() {
  const [projectId, setProjectId] = useState('');
  const [run, setRun] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-ai'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-optimize', projectId],
    queryFn: () => api.get(`/ai/optimize-assignments/${projectId}`).then((r) => r.data),
    enabled: run && !!projectId,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-purple-500" /> Optimisation des assignations
        </CardTitle>
        <CardDescription>Optimise l'ensemble des assignations d'un projet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Projet</label>
            <Select value={projectId} onChange={(e) => { setProjectId(e.target.value); setRun(false); }} className="w-60">
              <option value="">Choisir un projet</option>
              {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setRun(true)} disabled={!projectId || isLoading}>
            {isLoading ? <Spinner className="mr-2" /> : <Brain className="mr-2 h-4 w-4" />}
            Optimiser
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">Erreur: {error.response?.data?.message || error.message}</p>}
        {data && (
          <div className="rounded-lg bg-accent/30 p-4 space-y-3">
            {data.assignments && Array.isArray(data.assignments) && (
              <div className="space-y-2">
                {data.assignments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between rounded bg-white p-3 text-sm">
                    <div>
                      <span className="font-medium">{a.task?.title || `Tâche #${a.task_id}`}</span>
                      <span className="mx-2 text-muted-foreground">→</span>
                      <span className="text-primary font-medium">{a.suggested_user?.name || `User #${a.user_id}`}</span>
                    </div>
                    {a.score && <Badge variant="outline">Score: {a.score}</Badge>}
                  </div>
                ))}
              </div>
            )}
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-white p-3 text-xs">{JSON.stringify(data, null, 2)}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskBadge({ score }) {
  const variant = score >= 70 ? 'destructive' : score >= 40 ? 'warning' : 'success';
  const label = score >= 70 ? 'Élevé' : score >= 40 ? 'Moyen' : 'Faible';
  return <Badge variant={variant}>{score}% — {label}</Badge>;
}
