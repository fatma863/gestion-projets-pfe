import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Avatar } from '../../components/ui/Avatar';
import {
  MessageSquare, Clock, Paperclip, Users, Trash2, Send, Plus,
} from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

// Helper: coerce to number but treat empty string as null
const optionalNumber = z.preprocess(
  (val) => (val === '' || val === undefined ? null : val),
  z.coerce.number().min(0).nullable().optional()
);

const taskSchema = z.object({
  title: z.string().min(1, 'Le titre est obligatoire').max(255),
  description: z.string().optional().default(''),
  status_id: z.coerce.number().min(1, 'Le statut est obligatoire'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  complexity: z.coerce.number().min(1).max(10).optional().default(5),
  story_points: optionalNumber,
  planned_start: z.string().optional().default(''),
  planned_end: z.string().optional().default(''),
  due_date: z.string().optional().default(''),
  estimated_hours: optionalNumber,
  progress_percent: z.coerce.number().min(0).max(100).optional().default(0),
  parent_id: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.coerce.number().nullable().optional()
  ),
});

export default function TaskModal({ open, onClose, projectId, task, defaultStatusId, statuses }) {
  const isEdit = !!task;
  const [activeTab, setActiveTab] = useState('details');
  const [serverErrors, setServerErrors] = useState({});

  const createMutation = useCreateTask(projectId);
  const updateMutation = useUpdateTask(projectId);
  const deleteMutation = useDeleteTask(projectId);

  const { data: allTasks } = useQuery({
    queryKey: ['tasks', String(projectId)],
    queryFn: () => api.get(`/projects/${projectId}/tasks?all=1`).then((r) => r.data.tasks ?? r.data.data ?? r.data),
    enabled: open && !!projectId,
  });

  const parentOptions = (allTasks || []).filter((t) => t.id !== task?.id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '', description: '', status_id: '', priority: 'medium',
      complexity: 5, story_points: null, planned_start: '', planned_end: '',
      due_date: '', estimated_hours: null, progress_percent: 0, parent_id: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (task) {
        reset({
          title: task.title || '',
          description: task.description || '',
          status_id: task.status_id || '',
          priority: task.priority || 'medium',
          complexity: task.complexity || 5,
          story_points: task.story_points ?? null,
          planned_start: task.planned_start || '',
          planned_end: task.planned_end || '',
          due_date: task.due_date || '',
          estimated_hours: task.estimated_hours ?? null,
          progress_percent: task.progress_percent || 0,
          parent_id: task.parent_id ?? null,
        });
      } else {
        reset({
          title: '', description: '', status_id: defaultStatusId || '',
          priority: 'medium', complexity: 5, story_points: null,
          planned_start: '', planned_end: '', due_date: '',
          estimated_hours: null, progress_percent: 0, parent_id: null,
        });
      }
      setServerErrors({});
      setActiveTab('details');
    }
  }, [open, task, defaultStatusId, reset]);

  const onSubmit = (formData) => {
    const payload = { ...formData };
    // Clean empty optional fields
    ['planned_start', 'planned_end', 'due_date'].forEach((f) => {
      if (!payload[f]) delete payload[f];
    });
    if (!payload.estimated_hours && payload.estimated_hours !== 0) delete payload.estimated_hours;
    if (!payload.story_points && payload.story_points !== 0) delete payload.story_points;
    if (!payload.parent_id) delete payload.parent_id;

    const mutation = isEdit ? updateMutation : createMutation;
    const mutateArg = isEdit ? { taskId: task.id, data: payload } : payload;

    mutation.mutate(mutateArg, {
      onSuccess: () => onClose(),
      onError: (err) => {
        if (err.response?.status === 422) setServerErrors(err.response.data.errors || {});
      },
    });
  };

  const handleDelete = () => {
    if (window.confirm('Supprimer cette tâche ?')) {
      deleteMutation.mutate(task.id, { onSuccess: () => onClose() });
    }
  };

  const fieldError = (name) => {
    const client = errors[name]?.message;
    const server = serverErrors[name]?.[0];
    return client || server;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Modifier: ${task.title}` : 'Nouvelle tâche'}
      size="xl"
    >
      {/* Tabs */}
      <div className="-mt-2 mb-4 flex gap-1 border-b border-border">
        {[
          { key: 'details', label: 'Détails' },
          ...(isEdit ? [
            { key: 'comments', label: 'Commentaires', icon: MessageSquare },
            { key: 'time', label: 'Temps', icon: Clock },
            { key: 'assignees', label: 'Assignés', icon: Users },
          ] : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Titre *</label>
            <Input {...register('title')} />
            {fieldError('title') && <p className="mt-1 text-xs text-destructive">{fieldError('title')}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea {...register('description')} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Statut *</label>
              <Select {...register('status_id')}>
                <option value="">Choisir...</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              {fieldError('status_id') && <p className="mt-1 text-xs text-destructive">{fieldError('status_id')}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Priorité</label>
              <Select {...register('priority')}>
                {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Complexité (1-10)</label>
              <Input type="number" min={1} max={10} {...register('complexity')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Points de complexité</label>
              <Input type="number" min={0} {...register('story_points')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Heures estimées</label>
              <Input type="number" step="0.5" min={0} {...register('estimated_hours')} />
            </div>
            {isEdit && (
              <div>
                <label className="mb-1 block text-sm font-medium">Progression (%)</label>
                <Input type="number" min={0} max={100} {...register('progress_percent')} />
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Début planifié</label>
              <Input type="date" {...register('planned_start')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fin planifiée</label>
              <Input type="date" {...register('planned_end')} />
              {fieldError('planned_end') && <p className="mt-1 text-xs text-destructive">{fieldError('planned_end')}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Échéance</label>
              <Input type="date" {...register('due_date')} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Tâche parente</label>
            <Select {...register('parent_id')}>
              <option value="">Aucune (tâche racine)</option>
              {parentOptions.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </Select>
            {fieldError('parent_id') && <p className="mt-1 text-xs text-destructive">{fieldError('parent_id')}</p>}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              {isEdit && (
                <Button type="button" variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
              </Button>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'comments' && isEdit && <CommentsTab taskId={task.id} />}
      {activeTab === 'time' && isEdit && <TimeEntriesTab taskId={task.id} />}
      {activeTab === 'assignees' && isEdit && <AssigneesTab taskId={task.id} />}
    </Modal>
  );
}

function CommentsTab({ taskId }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/comments`).then((r) => r.data.comments),
  });

  const addMutation = useMutation({
    mutationFn: (text) => api.post(`/tasks/${taskId}/comments`, { body: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] });
      setBody('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (commentId) => api.delete(`/tasks/${taskId}/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', taskId] }),
  });

  if (isLoading) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="max-h-64 space-y-3 overflow-y-auto">
        {comments?.map((c) => (
          <div key={c.id} className="rounded-lg bg-accent/30 p-3">
            <div className="mb-1 flex items-center justify-between">
              <Avatar name={c.user?.name} src={c.user?.avatar} size="xs" />
              <span className="text-sm font-medium text-foreground">{c.user?.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString('fr-FR')}
                </span>
                <button
                  onClick={() => deleteMutation.mutate(c.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <p className="text-sm text-foreground">{c.body}</p>
          </div>
        ))}
        {comments?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun commentaire</p>
        )}
      </div>
      <div className="flex gap-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ajouter un commentaire..."
          rows={2}
          className="flex-1"
        />
        <Button
          size="sm"
          onClick={() => { if (body.trim()) addMutation.mutate(body.trim()); }}
          disabled={!body.trim() || addMutation.isPending}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function TimeEntriesTab({ taskId }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), minutes: '', note: '' });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['time-entries', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/time-entries`).then((r) => r.data.time_entries),
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/tasks/${taskId}/time-entries`, { ...data, source: 'manual' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-entries', taskId] });
      setForm((f) => ({ ...f, minutes: '', note: '' }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId) => api.delete(`/tasks/${taskId}/time-entries/${entryId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['time-entries', taskId] }),
  });

  if (isLoading) return <div className="flex justify-center py-6"><Spinner /></div>;

  const totalMinutes = entries?.reduce((sum, e) => sum + e.minutes, 0) || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium">Date</label>
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="w-36" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium">Minutes</label>
          <Input type="number" min={1} value={form.minutes} onChange={(e) => setForm((f) => ({ ...f, minutes: e.target.value }))} className="w-24" placeholder="60" />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium">Note</label>
          <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Optionnel" />
        </div>
        <Button
          size="sm"
          onClick={() => addMutation.mutate({ date: form.date, minutes: parseInt(form.minutes), note: form.note || undefined })}
          disabled={!form.minutes || addMutation.isPending}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-48 space-y-2 overflow-y-auto">
        {entries?.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg bg-accent/30 p-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium">{Math.floor(e.minutes / 60)}h {e.minutes % 60}m</span>
              <span className="text-xs text-muted-foreground">{new Date(e.date).toLocaleDateString('fr-FR')}</span>
              {e.note && <span className="text-xs text-muted-foreground">— {e.note}</span>}
            </div>
            <button onClick={() => deleteMutation.mutate(e.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssigneesTab({ taskId }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');

  const { data: assignees, isLoading } = useQuery({
    queryKey: ['assignees', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/assignees`).then((r) => r.data.assignees),
  });

  const assignMutation = useMutation({
    mutationFn: (data) => api.post(`/tasks/${taskId}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignees', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setUserId('');
    },
  });

  const unassignMutation = useMutation({
    mutationFn: (uid) => api.delete(`/tasks/${taskId}/unassign/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignees', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  if (isLoading) return <div className="flex justify-center py-6"><Spinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium">ID utilisateur</label>
          <Input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="ID" />
        </div>
        <Button
          size="sm"
          onClick={() => assignMutation.mutate({ user_id: parseInt(userId) })}
          disabled={!userId || assignMutation.isPending}
        >
          <Plus className="mr-1 h-4 w-4" /> Assigner
        </Button>
      </div>

      <div className="space-y-2">
        {assignees?.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg bg-accent/30 p-3">
            <div className="flex items-center gap-3">
              <Avatar name={a.user?.name} src={a.user?.avatar || a.avatar} size="sm" />
              <div>
                <p className="text-sm font-medium">{a.user?.name}</p>
                <p className="text-xs text-muted-foreground">{a.allocation_percent}% allocation</p>
              </div>
            </div>
            <button
              onClick={() => unassignMutation.mutate(a.user?.id || a.user_id)}
              className="rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {assignees?.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun assigné</p>
        )}
      </div>
    </div>
  );
}
