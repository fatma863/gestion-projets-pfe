import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useSprints, useSprint, useBurndown } from '../../hooks/useSprints';
import { useMoveTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { useSprintAnalytics, useSprintSuggestions } from '../../hooks/useScrumGenerator';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar, AvatarGroup } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { motion } from 'framer-motion';
import {
  Layers, Target, ListTodo, Calendar, TrendingDown, Brain,
  AlertTriangle, CheckCircle2, Clock, ChevronRight,
  ArrowRight, BarChart3, Users, Zap, Info,
} from 'lucide-react';

const PRIORITY_BADGE = {
  low: { label: 'Basse', variant: 'secondary' },
  medium: { label: 'Moyenne', variant: 'info' },
  high: { label: 'Haute', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

const HEALTH_MAP = {
  'on-track': { label: 'En bonne voie', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: CheckCircle2 },
  'at-risk':  { label: 'À risque',     color: 'text-amber-600',   bg: 'bg-amber-100',   icon: AlertTriangle },
  'behind':   { label: 'En retard',    color: 'text-red-600',     bg: 'bg-red-100',     icon: AlertTriangle },
};

const SEVERITY_COLORS = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-red-200 bg-red-50 text-red-700',
};

export default function ManagerScrumBoardPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSprint, setSelectedSprint] = useState('');
  const [tab, setTab] = useState('board'); // board | analytics

  const { data: projects } = useQuery({
    queryKey: ['projects-for-scrum-board'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: sprints } = useSprints(selectedProject);
  const { data: sprint, isLoading: loadingSprint } = useSprint(selectedSprint);

  // Auto-select active sprint
  const autoSelected = useRef(false);
  if (sprints?.length && !selectedSprint && !autoSelected.current) {
    const active = sprints.find((s) => s.status === 'active');
    if (active) {
      setSelectedSprint(String(active.id));
      autoSelected.current = true;
    }
  }

  // Reset auto-select on project change
  const handleProjectChange = (val) => {
    setSelectedProject(val);
    setSelectedSprint('');
    autoSelected.current = false;
  };

  const tasks = sprint?.tasks || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scrum Board"
        description="Tableau Kanban du sprint actif"
        actions={
          selectedSprint && (
            <div className="flex gap-2">
              <Button
                variant={tab === 'board' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTab('board')}
              >
                <Layers className="mr-1.5 h-4 w-4" /> Board
              </Button>
              <Button
                variant={tab === 'analytics' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTab('analytics')}
              >
                <BarChart3 className="mr-1.5 h-4 w-4" /> Analytics
              </Button>
            </div>
          )
        }
      />

      {/* Selectors */}
      <div className="flex gap-4">
        <div className="w-64">
          <Select value={selectedProject} onChange={(e) => handleProjectChange(e.target.value)}>
            <option value="">Sélectionner un projet</option>
            {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </div>
        {selectedProject && sprints?.length > 0 && (
          <div className="w-64">
            <Select value={selectedSprint} onChange={(e) => setSelectedSprint(e.target.value)}>
              <option value="">Sélectionner un sprint</option>
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status === 'active' ? 'Actif' : s.status === 'completed' ? 'Terminé' : 'Planifié'})
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {!selectedProject ? (
        <EmptyState icon={Layers} title="Sélectionnez un projet" description="Choisissez un projet pour accéder au Scrum Board" />
      ) : !selectedSprint ? (
        <EmptyState icon={Target} title="Sélectionnez un sprint" description="Choisissez un sprint ou créez-en un depuis la page Sprints" />
      ) : loadingSprint ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : tab === 'board' ? (
        <ScrumKanban tasks={tasks} sprint={sprint} projectId={selectedProject} />
      ) : (
        <SprintAnalyticsPanel sprintId={selectedSprint} projectId={selectedProject} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SCRUM KANBAN BOARD (Drag & Drop)
   ═══════════════════════════════════════════════════════════ */
function ScrumKanban({ tasks, sprint, projectId }) {
  const [dragTask, setDragTask] = useState(null);
  const queryClient = useQueryClient();
  const moveMutation = useMoveTask(projectId);

  const { data: statuses } = useQuery({
    queryKey: ['project-statuses', projectId],
    queryFn: () => api.get(`/projects/${projectId}/statuses`).then((r) => r.data.data ?? r.data.statuses ?? r.data),
    enabled: !!projectId,
  });

  if (!statuses?.length) {
    return <EmptyState icon={ListTodo} title="Aucun statut configuré" description="Le projet n'a pas encore de colonnes de statut" />;
  }

  const handleDragStart = (e, task) => {
    setDragTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, statusId) => {
    e.preventDefault();
    if (!dragTask || dragTask.status_id === statusId) {
      setDragTask(null);
      return;
    }

    moveMutation.mutate(
      { taskId: dragTask.id, statusId, order: 0 },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['sprint', String(sprint.id)] });
        },
      }
    );
    setDragTask(null);
  };

  const columns = statuses.map((status) => ({
    ...status,
    tasks: tasks.filter((t) => t.status_id === status.id || t.status?.id === status.id),
  }));

  const totalTasks = tasks.length;
  const doneTasks = columns[columns.length - 1]?.tasks.length || 0;

  return (
    <div className="space-y-4">
      {/* Sprint info bar */}
      <div className="flex items-center justify-between rounded-lg bg-accent/30 p-3 border border-border">
        <div className="flex items-center gap-4">
          <span className="font-semibold">{sprint.name}</span>
          <Badge variant={sprint.status === 'active' ? 'success' : 'secondary'}>
            {sprint.status === 'active' ? 'Actif' : sprint.status === 'completed' ? 'Terminé' : 'Planifié'}
          </Badge>
          <span className="text-sm text-muted-foreground">{sprint.start_date} → {sprint.end_date}</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">{doneTasks}/{totalTasks} tâches</span>
          <ProgressBar value={totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0} className="w-32" />
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
        {columns.map((col) => (
          <div
            key={col.id}
            className="flex w-72 min-w-[288px] flex-col rounded-xl bg-accent/20 border border-border"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.color || '#94a3b8' }} />
                <span className="text-sm font-semibold">{col.name}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{col.tasks.length}</Badge>
            </div>

            {/* Column tasks */}
            <div className="flex-1 space-y-2 p-2 overflow-y-auto custom-scrollbar" style={{ maxHeight: 600 }}>
              {col.tasks.map((task) => (
                <motion.div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  layoutId={`task-${task.id}`}
                  className="cursor-grab active:cursor-grabbing rounded-lg border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <span className="text-sm font-medium leading-tight">{task.title}</span>
                    {task.priority && (
                      <Badge variant={PRIORITY_BADGE[task.priority]?.variant || 'outline'} className="text-[9px] shrink-0">
                        {PRIORITY_BADGE[task.priority]?.label || task.priority}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {task.story_points && (
                      <span className="bg-muted px-1.5 py-0.5 rounded">{task.story_points} pts</span>
                    )}
                    {task.estimated_hours && (
                      <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{task.estimated_hours}h</span>
                    )}
                    {task.progress_percent > 0 && (
                      <span>{task.progress_percent}%</span>
                    )}
                  </div>
                  {task.assignees?.length > 0 && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <AvatarGroup users={task.assignees} max={3} size="xs" />
                      <span className="text-[11px] text-muted-foreground truncate">
                        {task.assignees.map((a) => a.name?.split(' ')[0]).join(', ')}
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}

              {col.tasks.length === 0 && (
                <div className="flex items-center justify-center py-8 text-xs text-muted-foreground">
                  Glissez des tâches ici
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SPRINT ANALYTICS PANEL
   ═══════════════════════════════════════════════════════════ */
function SprintAnalyticsPanel({ sprintId, projectId }) {
  const { data: analytics, isLoading: loadingAnalytics } = useSprintAnalytics(sprintId);
  const { data: suggestions, isLoading: loadingSuggestions } = useSprintSuggestions(sprintId);
  const { data: burndownData } = useBurndown(sprintId);

  if (loadingAnalytics) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  const health = analytics?.health;
  const velocity = analytics?.velocity || [];
  const workload = health?.team_workload || [];
  const healthStatus = HEALTH_MAP[health?.health] || HEALTH_MAP['on-track'];
  const HealthIcon = healthStatus.icon;

  return (
    <div className="space-y-6">
      {/* Health metrics */}
      {health && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${healthStatus.bg}`}>
                <HealthIcon className={`h-5 w-5 ${healthStatus.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold">{healthStatus.label}</p>
                <p className="text-xs text-muted-foreground">{health.progress}% complété</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{health.completed_points}/{health.total_points}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <TrendingDown className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{health.velocity}</p>
                <p className="text-xs text-muted-foreground">pts/jour</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{health.days_remaining}</p>
                <p className="text-xs text-muted-foreground">jours restants</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Burndown chart */}
      {burndownData?.burndown?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" /> Burndown Chart
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BurndownChart data={burndownData.burndown} totalPoints={burndownData.total_points} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Velocity chart */}
        {velocity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Vélocité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VelocityChart data={velocity} />
            </CardContent>
          </Card>
        )}

        {/* AI Suggestions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" /> Suggestions IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSuggestions ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : !suggestions?.length ? (
              <p className="text-sm text-muted-foreground">Aucune suggestion pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {suggestions.map((s, i) => (
                  <div key={i} className={`rounded-lg border p-3 text-sm ${SEVERITY_COLORS[s.severity] || SEVERITY_COLORS.info}`}>
                    {s.message}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team workload */}
      {workload.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> Charge d'équipe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workload.map((w) => (
                <div key={w.user_id} className="flex items-center gap-4">
                  <span className="text-sm font-medium w-32 truncate">{w.name}</span>
                  <div className="flex-1">
                    <ProgressBar value={w.tasks > 0 ? (w.completed / w.tasks) * 100 : 0} />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {w.completed}/{w.tasks} tâches · {w.points || 0} pts
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predicted completion */}
      {health?.predicted_completion && (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
              <Zap className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-medium">Prédiction de fin</p>
              <p className="text-xs text-muted-foreground">
                Au rythme actuel, le sprint se terminera vers le <strong>{health.predicted_completion}</strong>
                {health.predicted_completion > sprint?.end_date ? ' (en retard)' : ' (dans les temps)'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ─── Burndown Chart (SVG) ─────────────────────────────── */
function BurndownChart({ data, totalPoints }) {
  if (!data?.length) return null;

  const width = 700;
  const height = 280;
  const pad = { top: 20, right: 20, bottom: 40, left: 50 };
  const cW = width - pad.left - pad.right;
  const cH = height - pad.top - pad.bottom;
  const maxY = totalPoints || Math.max(...data.map((d) => d.ideal));
  const xS = (i) => pad.left + (i / (data.length - 1)) * cW;
  const yS = (v) => pad.top + cH - (v / maxY) * cH;

  const idealLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xS(i)},${yS(d.ideal)}`).join(' ');
  const actualData = data.filter((d) => d.actual !== null);
  const actualLine = actualData.map((d, i) => {
    const idx = data.indexOf(d);
    return `${i === 0 ? 'M' : 'L'}${xS(idx)},${yS(d.actual)}`;
  }).join(' ');
  const labelInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 280 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={pad.left} y1={yS(maxY * f)} x2={width - pad.right} y2={yS(maxY * f)} stroke="#e2e8f0" strokeDasharray="4,4" />
          <text x={pad.left - 8} y={yS(maxY * f) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{Math.round(maxY * f)}</text>
        </g>
      ))}
      <path d={idealLine} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,4" />
      {actualLine && <path d={actualLine} fill="none" stroke="#6366f1" strokeWidth="2.5" />}
      {actualData.map((d) => {
        const idx = data.indexOf(d);
        return <circle key={idx} cx={xS(idx)} cy={yS(d.actual)} r="3.5" fill="#6366f1" />;
      })}
      {data.map((d, i) => {
        if (i % labelInterval !== 0 && i !== data.length - 1) return null;
        return <text key={i} x={xS(i)} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">{d.date.slice(5)}</text>;
      })}
      <g transform={`translate(${pad.left + 10}, ${pad.top + 10})`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,3" />
        <text x="25" y="4" className="fill-slate-500 text-[11px]">Idéal</text>
        <line x1="80" y1="0" x2="100" y2="0" stroke="#6366f1" strokeWidth="2.5" />
        <text x="105" y="4" className="fill-slate-500 text-[11px]">Réel</text>
      </g>
    </svg>
  );
}

/* ─── Velocity Chart (Bar chart) ───────────────────────── */
function VelocityChart({ data }) {
  if (!data?.length) return null;

  const width = 400;
  const height = 200;
  const pad = { top: 10, right: 10, bottom: 40, left: 40 };
  const cW = width - pad.left - pad.right;
  const cH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.flatMap((d) => [d.committed, d.completed]), 1);
  const barW = Math.min(20, cW / (data.length * 3));
  const groupW = cW / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 200 }}>
      {data.map((d, i) => {
        const x = pad.left + i * groupW + groupW / 2;
        const cH1 = (d.committed / maxVal) * cH;
        const cH2 = (d.completed / maxVal) * cH;
        return (
          <g key={i}>
            <rect x={x - barW - 1} y={pad.top + cH - cH1} width={barW} height={cH1} fill="#94a3b8" rx="2" />
            <rect x={x + 1} y={pad.top + cH - cH2} width={barW} height={cH2} fill="#6366f1" rx="2" />
            <text x={x} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[9px]">
              {d.sprint_name.length > 8 ? d.sprint_name.slice(0, 8) + '…' : d.sprint_name}
            </text>
          </g>
        );
      })}
      <g transform={`translate(${pad.left + 5}, ${pad.top})`}>
        <rect x="0" y="0" width="8" height="8" fill="#94a3b8" rx="1" />
        <text x="12" y="7" className="fill-slate-500 text-[9px]">Engagé</text>
        <rect x="60" y="0" width="8" height="8" fill="#6366f1" rx="1" />
        <text x="72" y="7" className="fill-slate-500 text-[9px]">Réalisé</text>
      </g>
    </svg>
  );
}
