import { useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useSprint, useUpdateSprint, useRemoveTaskFromSprint, useAddTasksToSprint, useBurndown, useBacklog } from '../../hooks/useSprints';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { AvatarGroup, Avatar } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';
import {
  Target, Calendar, ListTodo, Trash2, Plus, ArrowLeft, TrendingDown,
  CheckCircle2, Clock, AlertTriangle, MessageSquare, Users,
} from 'lucide-react';

const STATUS_MAP = {
  planned: { label: 'Planifié', variant: 'secondary' },
  active: { label: 'Actif', variant: 'success' },
  completed: { label: 'Terminé', variant: 'default' },
};

const PRIORITY_MAP = {
  low: { label: 'Basse', variant: 'secondary' },
  medium: { label: 'Moyenne', variant: 'info' },
  high: { label: 'Haute', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

export default function ManagerSprintDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [showAddTasks, setShowAddTasks] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: sprint, isLoading } = useSprint(id);
  const { data: burndownData } = useBurndown(id);
  const removeMutation = useRemoveTaskFromSprint(projectId);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!sprint) return <EmptyState title="Sprint introuvable" />;

  const tasks = sprint.tasks || [];
  const totalPoints = tasks.reduce((sum, t) => sum + (t.story_points || 1), 0);
  const doneCount = tasks.filter((t) => t.progress_percent >= 100).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={sprint.name}
        description={sprint.goal}
        back
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEdit(true)}>Modifier</Button>
            <Button variant="outline" onClick={() => setShowAddTasks(true)}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter des tâches
            </Button>
            <Link to={`/manager/standups/${id}?project=${projectId}`}>
              <Button variant="outline"><MessageSquare className="mr-2 h-4 w-4" /> Standups</Button>
            </Link>
          </div>
        }
      />

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tasks.length}</p>
              <p className="text-xs text-muted-foreground">Tâches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{doneCount}</p>
              <p className="text-xs text-muted-foreground">Terminées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Target className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints}</p>
              <p className="text-xs text-muted-foreground">Points totaux</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <Calendar className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium">{sprint.start_date}</p>
              <p className="text-xs text-muted-foreground">→ {sprint.end_date}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Sprint tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tâches du sprint</CardTitle>
            <Badge variant={STATUS_MAP[sprint.status]?.variant}>{STATUS_MAP[sprint.status]?.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!tasks.length ? (
            <EmptyState icon={ListTodo} title="Aucune tâche" description="Ajoutez des tâches depuis le backlog" action={() => setShowAddTasks(true)} actionLabel="Ajouter des tâches" />
          ) : (
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{task.title}</span>
                      <Badge variant={PRIORITY_MAP[task.priority]?.variant || 'outline'} className="text-[10px]">
                        {PRIORITY_MAP[task.priority]?.label || task.priority}
                      </Badge>
                      {task.story_points && (
                        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {task.story_points} pts
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.status && (
                        <span className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: task.status.color || '#94a3b8' }} />
                          {task.status.name}
                        </span>
                      )}
                      {task.assignees?.length > 0 && (
                        <AvatarGroup users={task.assignees} max={3} size="xs" />
                      )}
                      <span>{task.progress_percent || 0}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeMutation.mutate({ sprintId: id, taskId: task.id })}
                    className="ml-2 rounded-md p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors"
                    title="Retirer du sprint"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTasksModal open={showAddTasks} onClose={() => setShowAddTasks(false)} sprintId={id} projectId={projectId} />
      <EditSprintModal open={showEdit} onClose={() => setShowEdit(false)} sprint={sprint} projectId={projectId} />
    </div>
  );
}

/* ─── Burndown Chart (SVG) ─────────────────────────────── */
function BurndownChart({ data, totalPoints }) {
  if (!data?.length) return null;

  const width = 700;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxY = totalPoints || Math.max(...data.map((d) => d.ideal));
  const xScale = (i) => padding.left + (i / (data.length - 1)) * chartW;
  const yScale = (v) => padding.top + chartH - (v / maxY) * chartH;

  const idealLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(d.ideal)}`).join(' ');
  const actualData = data.filter((d) => d.actual !== null);
  const actualLine = actualData.map((d, i) => {
    const idx = data.indexOf(d);
    return `${i === 0 ? 'M' : 'L'}${xScale(idx)},${yScale(d.actual)}`;
  }).join(' ');

  const labelInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: 300 }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((frac) => (
        <g key={frac}>
          <line
            x1={padding.left} y1={yScale(maxY * frac)}
            x2={width - padding.right} y2={yScale(maxY * frac)}
            stroke="#e2e8f0" strokeDasharray="4,4"
          />
          <text x={padding.left - 8} y={yScale(maxY * frac) + 4} textAnchor="end" className="fill-slate-400 text-[11px]">
            {Math.round(maxY * frac)}
          </text>
        </g>
      ))}

      {/* Ideal line */}
      <path d={idealLine} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="6,4" />

      {/* Actual line */}
      {actualLine && <path d={actualLine} fill="none" stroke="#6366f1" strokeWidth="2.5" />}

      {/* Actual dots */}
      {actualData.map((d) => {
        const idx = data.indexOf(d);
        return <circle key={idx} cx={xScale(idx)} cy={yScale(d.actual)} r="3.5" fill="#6366f1" />;
      })}

      {/* X axis labels */}
      {data.map((d, i) => {
        if (i % labelInterval !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={xScale(i)} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
            {d.date.slice(5)}
          </text>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${padding.left + 10}, ${padding.top + 10})`}>
        <line x1="0" y1="0" x2="20" y2="0" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4,3" />
        <text x="25" y="4" className="fill-slate-500 text-[11px]">Idéal</text>
        <line x1="80" y1="0" x2="100" y2="0" stroke="#6366f1" strokeWidth="2.5" />
        <text x="105" y="4" className="fill-slate-500 text-[11px]">Réel</text>
      </g>
    </svg>
  );
}

/* ─── Add Tasks Modal ──────────────────────────────────── */
function AddTasksModal({ open, onClose, sprintId, projectId }) {
  const { data: backlogTasks, isLoading } = useBacklog(projectId);
  const addMutation = useAddTasksToSprint(projectId);
  const [selected, setSelected] = useState([]);

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleAdd = () => {
    if (!selected.length) return;
    addMutation.mutate({ sprintId, taskIds: selected }, {
      onSuccess: () => { setSelected([]); onClose(); },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Ajouter des tâches au sprint" size="lg">
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : !backlogTasks?.length ? (
        <EmptyState icon={ListTodo} title="Backlog vide" description="Toutes les tâches sont déjà dans un sprint" />
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{backlogTasks.length} tâches dans le backlog</span>
            <button onClick={() => setSelected(backlogTasks.map((t) => t.id))} className="text-xs text-primary hover:underline">Tout sélectionner</button>
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {backlogTasks.map((task) => (
              <label key={task.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                <input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggle(task.id)} className="h-4 w-4 rounded border-gray-300" />
                <div className="flex-1">
                  <span className="text-sm font-medium">{task.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={PRIORITY_MAP[task.priority]?.variant || 'outline'} className="text-[10px]">
                      {PRIORITY_MAP[task.priority]?.label || task.priority}
                    </Badge>
                    {task.story_points && <span className="text-xs text-muted-foreground">{task.story_points} pts</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!selected.length || addMutation.isPending}>
              {addMutation.isPending ? 'Ajout...' : `Ajouter ${selected.length} tâche(s)`}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ─── Edit Sprint Modal ────────────────────────────────── */
function EditSprintModal({ open, onClose, sprint, projectId }) {
  const updateMutation = useUpdateSprint(projectId);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  useState(() => {
    if (sprint) {
      setForm({ name: sprint.name, goal: sprint.goal || '', start_date: sprint.start_date, end_date: sprint.end_date, status: sprint.status });
    }
  }, [sprint]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    updateMutation.mutate({ sprintId: sprint.id, data: form }, {
      onSuccess: () => onClose(),
      onError: (err) => { if (err.response?.status === 422) setErrors(err.response.data.errors || {}); },
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Modifier le sprint">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nom *</label>
          <Input value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Objectif</label>
          <Textarea value={form.goal || ''} onChange={(e) => set('goal', e.target.value)} rows={3} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Date de début *</label>
            <Input type="date" value={form.start_date || ''} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date de fin *</label>
            <Input type="date" value={form.end_date || ''} onChange={(e) => set('end_date', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Statut</label>
          <Select value={form.status || 'planned'} onChange={(e) => set('status', e.target.value)}>
            <option value="planned">Planifié</option>
            <option value="active">Actif</option>
            <option value="completed">Terminé</option>
          </Select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
