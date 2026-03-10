import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useTasks, useMoveTask } from '../../hooks/useTasks';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { Avatar, AvatarGroup } from '../../components/ui/Avatar';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { motion } from 'framer-motion';
import TaskModal from '../projects/TaskModal';
import {
  ArrowLeft, Plus, GripVertical, Clock, AlertTriangle,
  BarChart3, Users, Activity, Gauge, Calendar, MessageSquare, UserCheck,
} from 'lucide-react';

const PRIORITY_COLORS = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-amber-100 text-amber-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const STATUS_LABELS = {
  planning: 'Planification',
  active: 'Actif',
  on_hold: 'En pause',
  completed: 'Terminé',
  cancelled: 'Annulé',
};

const ACTION_LABELS = {
  project_created: 'a créé le projet',
  member_added: 'a ajouté un membre',
  member_removed: 'a retiré un membre',
  task_created: 'a créé une tâche',
  task_updated: 'a modifié une tâche',
  task_deleted: 'a supprimé une tâche',
  task_moved: 'a déplacé une tâche',
  comment_added: 'a commenté',
  attachment_added: 'a ajouté une pièce jointe',
  time_entry_added: 'a enregistré du temps',
};

export default function ManagerProjectDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [taskModal, setTaskModal] = useState({ open: false, task: null, statusId: null });
  const [tab, setTab] = useState('kanban');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then((r) => r.data.project),
  });

  const { data: statuses } = useQuery({
    queryKey: ['statuses', id],
    queryFn: () => api.get(`/projects/${id}/statuses`).then((r) => r.data.statuses),
  });

  const { data: tasks } = useTasks(id);

  const { data: dashboard } = useQuery({
    queryKey: ['project-dashboard', id],
    queryFn: () => api.get(`/projects/${id}/dashboard`).then((r) => r.data),
  });

  const moveMutation = useMoveTask(id);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!project) return <div className="py-20 text-center text-muted-foreground">Projet non trouvé</div>;

  const tasksByStatus = (statusId) =>
    (tasks || []).filter((t) => t.status_id === statusId).sort((a, b) => a.kanban_order - b.kanban_order);

  const handleDrop = (e, statusId) => {
    e.preventDefault();
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    const tasksInColumn = tasksByStatus(statusId);
    moveMutation.mutate({ taskId, statusId, order: tasksInColumn.length });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(-1)} className="mt-1 rounded-md p-1 hover:bg-accent">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">{project.code}</span>
              <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>{STATUS_LABELS[project.status] || project.status}</Badge>
              <Badge variant="outline" className="text-xs">Gestion</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {project.description && <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>}
            {project.manager && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Avatar name={project.manager.name} src={project.manager.avatar} size="xs" /> Manager : <span className="font-medium text-foreground">{project.manager.name}</span>
              </p>
            )}
          </div>
        </div>
        <Button onClick={() => setTaskModal({ open: true, task: null, statusId: statuses?.[0]?.id })}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle tâche
        </Button>
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <MiniStat label="Total tâches" value={dashboard.total_tasks} />
          <MiniStat label="Terminées" value={dashboard.completed_tasks} />
          <MiniStat label="En retard" value={dashboard.overdue_tasks} color="text-destructive" />
          <MiniStat label="Progression moy." value={`${dashboard.avg_progress || 0}%`} />
          <MiniStat label="Heures estimées" value={dashboard.total_estimated_hours || 0} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { key: 'kanban', label: 'Kanban', icon: BarChart3 },
          { key: 'members', label: 'Membres', icon: Users },
          { key: 'activity', label: 'Activité', icon: Activity },
          { key: 'workload', label: 'Charge', icon: Gauge },
        ].map((t) => {
          const TabIcon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${tab === t.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <TabIcon size={15} /> {t.label}
              {tab === t.key && <motion.div layoutId="manager-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      {tab === 'kanban' && (
        <KanbanBoard statuses={statuses || []} tasksByStatus={tasksByStatus} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onAddTask={(statusId) => setTaskModal({ open: true, task: null, statusId })} onEditTask={(task) => setTaskModal({ open: true, task, statusId: task.status_id })} />
      )}
      {tab === 'members' && <MembersTab projectId={id} />}
      {tab === 'activity' && <ActivityTab projectId={id} />}
      {tab === 'workload' && <WorkloadTab projectId={id} />}

      <TaskModal open={taskModal.open} onClose={() => setTaskModal({ open: false, task: null, statusId: null })} projectId={parseInt(id)} task={taskModal.task} defaultStatusId={taskModal.statusId} statuses={statuses || []} />
    </div>
  );
}

function MiniStat({ label, value, color }) {
  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3 transition-all hover:shadow-sm">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-lg font-bold ${color || 'text-foreground'}`}>{value}</p>
    </div>
  );
}

function KanbanBoard({ statuses, tasksByStatus, onDrop, onDragOver, onAddTask, onEditTask }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {statuses.map((status, i) => {
        const columnTasks = tasksByStatus(status.id);
        return (
          <motion.div key={status.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex w-72 flex-shrink-0 flex-col rounded-xl bg-muted/30 border border-border/50" onDrop={(e) => onDrop(e, status.id)} onDragOver={onDragOver}>
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: status.color || '#6b7280' }} />
                <span className="text-[13px] font-semibold text-foreground">{status.name}</span>
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">{columnTasks.length}</span>
              </div>
              <button onClick={() => onAddTask(status.id)} className="rounded-md p-1 hover:bg-accent transition-colors"><Plus className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-2 pb-2 min-h-[60px]">
              {columnTasks.map((task) => <KanbanCard key={task.id} task={task} onClick={() => onEditTask(task)} />)}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function KanbanCard({ task, onClick }) {
  const handleDragStart = (e) => { e.dataTransfer.setData('taskId', task.id.toString()); e.currentTarget.style.opacity = '0.5'; };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = '1'; };

  return (
    <div draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd} onClick={onClick} className="group cursor-pointer rounded-xl border border-border/60 bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md hover:border-border active:scale-[0.98]">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <h4 className="text-[13px] font-medium text-foreground leading-snug">{task.title}</h4>
        <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {task.description && <p className="mb-2 line-clamp-2 text-xs text-muted-foreground/80">{task.description}</p>}
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[task.priority] || ''}`}>{{ low: 'Basse', medium: 'Moyenne', high: 'Haute', urgent: 'Urgente' }[task.priority] || task.priority}</span>
        {task.is_overdue && <span className="flex items-center gap-0.5 rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600"><AlertTriangle className="h-2.5 w-2.5" /> Retard</span>}
        {task.due_date && !task.is_overdue && <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><Calendar className="h-2.5 w-2.5" />{new Date(task.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
        {task.comments_count > 0 && <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground"><MessageSquare className="h-2.5 w-2.5" /> {task.comments_count}</span>}
      </div>
      <div className="flex items-center justify-between">
        {task.assignees?.length > 0 ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <AvatarGroup max={3}>{task.assignees.map((a) => <Avatar key={a.id} name={a.user?.name || a.name} src={a.user?.avatar || a.avatar} size="xs" />)}</AvatarGroup>
            <span className="truncate text-[11px] text-muted-foreground">{task.assignees.map((a) => a.user?.name || a.name).join(', ')}</span>
          </div>
        ) : <div />}
        {task.progress_percent > 0 && <div className="flex items-center gap-1.5 w-20"><ProgressBar value={task.progress_percent} size="sm" /><span className="text-[10px] font-medium text-muted-foreground">{task.progress_percent}%</span></div>}
      </div>
    </div>
  );
}

function MembersTab({ projectId }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('developer');

  const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Manager', developer: 'Développeur', designer: 'Designer', tester: 'Testeur', viewer: 'Observateur' };

  const { data: members, isLoading } = useQuery({ queryKey: ['project-members', projectId], queryFn: () => api.get(`/projects/${projectId}/members`).then((r) => r.data.members) });
  const { data: allUsers } = useQuery({
    queryKey: ['search-users'],
    queryFn: () => api.get('/projects/search-users').then((r) => r.data.users),
  });

  const availableUsers = (allUsers || []).filter((u) => !members?.some((m) => (m.id || m.user_id) === u.id));

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/projects/${projectId}/members`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['project-members', projectId] }); setShowAdd(false); setUserId(''); },
  });
  const removeMutation = useMutation({
    mutationFn: (uid) => api.delete(`/projects/${projectId}/members/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['project-members', projectId] }),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Membres du projet</h3>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}><Plus className="mr-1 h-4 w-4" /> Ajouter</Button>
      </div>
      {showAdd && (
        <Card><CardContent className="flex items-end gap-3 p-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Utilisateur</label>
            <select value={userId} onChange={(e) => setUserId(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm">
              <option value="">Sélectionner un membre...</option>
              {availableUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="flex h-10 rounded-md border border-input bg-white px-3 py-2 text-sm">
              <option value="manager">Gestionnaire</option>
              <option value="developer">Développeur</option>
              <option value="designer">Concepteur</option>
              <option value="tester">Testeur</option>
              <option value="viewer">Observateur</option>
            </select>
          </div>
          <Button size="sm" onClick={() => addMutation.mutate({ user_id: parseInt(userId), project_role: role })} disabled={!userId || addMutation.isPending}>Ajouter</Button>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {members?.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-3 transition-all hover:shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar name={m.name || m.user?.name} src={m.avatar || m.user?.avatar} size="sm" />
              <div><p className="text-sm font-medium text-foreground">{m.name || m.user?.name}</p><p className="text-xs text-muted-foreground">{m.email || m.user?.email}</p></div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{ROLE_LABELS[m.project_role || m.pivot?.project_role] || m.project_role || 'Membre'}</Badge>
              <button onClick={() => { if (window.confirm('Retirer ce membre ?')) removeMutation.mutate(m.id || m.user_id); }} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive">×</button>
            </div>
          </div>
        ))}
        {members?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Aucun membre ajouté</p>}
      </div>
    </div>
  );
}

function ActivityTab({ projectId }) {
  const { data: activities, isLoading } = useQuery({ queryKey: ['project-activities', projectId], queryFn: () => api.get(`/projects/${projectId}/activities`).then((r) => r.data.activities) });
  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!activities || activities.length === 0) return <Card><CardContent className="py-10 text-center text-muted-foreground">Aucune activité enregistrée</CardContent></Card>;

  return (
    <div className="space-y-1">
      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Activity className="h-5 w-5" /> Journal d'activité</h3>
      <div className="relative border-l-2 border-border pl-6 space-y-4">
        {activities.map((a) => (
          <div key={a.id} className="relative">
            <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm"><Avatar name={a.user?.name || 'S'} src={a.user?.avatar} size="xs" className="inline-block mr-1 align-text-bottom" /><span className="font-medium">{a.user?.name || 'Système'}</span>{' '}<span className="text-muted-foreground">{ACTION_LABELS[a.action] || a.action}</span>{a.properties?.title && <span className="font-medium ml-1">« {a.properties.title} »</span>}</p>
                <span className="text-xs text-muted-foreground shrink-0 ml-2">{a.human_time}</span>
              </div>
              {a.action === 'task_moved' && a.properties?.from && <p className="text-xs text-muted-foreground mt-1">{a.properties.from} → {a.properties.to}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkloadTab({ projectId }) {
  const { data, isLoading } = useQuery({ queryKey: ['project-workload', projectId], queryFn: () => api.get(`/projects/${projectId}/workload`).then((r) => r.data) });
  if (isLoading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (!data?.members?.length) return <Card><CardContent className="py-10 text-center text-muted-foreground">Aucun membre d'équipe trouvé</CardContent></Card>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2"><Gauge className="h-5 w-5" /> Charge de travail</h3>
        {data.summary && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{data.summary.total_members} membres</span>
            {data.summary.overloaded_count > 0 && <Badge variant="destructive">{data.summary.overloaded_count} surchargé(s)</Badge>}
          </div>
        )}
      </div>
      {data.alerts?.length > 0 && (
        <Card className="border-red-200 bg-red-50/30"><CardContent className="p-4">
          <p className="text-sm font-medium text-red-700 mb-2 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Alertes de surcharge</p>
          <div className="space-y-2">{data.alerts.map((a) => <div key={a.user_id} className="rounded bg-white p-2 text-sm"><span className="font-medium">{a.name}</span><span className="text-muted-foreground ml-2">— {a.overload_reasons?.join(', ')}</span></div>)}</div>
        </CardContent></Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {data.members.map((m) => (
          <Card key={m.user_id} className={m.overloaded ? 'border-red-200' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2"><Avatar name={m.name} src={m.avatar} size="sm" /><div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div></div>
                {m.overloaded && <Badge variant="destructive">Surchargé</Badge>}
              </div>
              <ProgressBar value={m.utilization_percent} label="Utilisation" showValue size="md" color={m.utilization_percent > 100 ? 'bg-red-500' : m.utilization_percent > 75 ? 'bg-amber-500' : 'bg-emerald-500'} />
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                <div><span className="text-muted-foreground">Tâches actives</span><p className="font-semibold">{m.active_tasks_count}</p></div>
                <div><span className="text-muted-foreground">Heures estimées</span><p className="font-semibold">{m.estimated_hours}h</p></div>
                <div><span className="text-muted-foreground">Échéances proches</span><p className={`font-semibold ${m.upcoming_deadlines >= 3 ? 'text-amber-600' : ''}`}>{m.upcoming_deadlines}</p></div>
                <div><span className="text-muted-foreground">En retard</span><p className={`font-semibold ${m.overdue_count > 0 ? 'text-red-600' : ''}`}>{m.overdue_count}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
