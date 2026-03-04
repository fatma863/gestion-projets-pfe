import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import {
  MessageSquare, Clock, Paperclip, Users, Trash2, Send, Plus,
} from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Basse' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

const EMPTY_FORM = {
  title: '', description: '', status_id: '', priority: 'medium',
  complexity: 5, planned_start: '', planned_end: '', due_date: '',
  estimated_hours: '', progress_percent: 0,
};

export default function TaskModal({ open, onClose, projectId, task, defaultStatusId, statuses }) {
  const queryClient = useQueryClient();
  const isEdit = !!task;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (open) {
      if (task) {
        setForm({
          title: task.title || '',
          description: task.description || '',
          status_id: task.status_id || '',
          priority: task.priority || 'medium',
          complexity: task.complexity || 5,
          planned_start: task.planned_start || '',
          planned_end: task.planned_end || '',
          due_date: task.due_date || '',
          estimated_hours: task.estimated_hours || '',
          progress_percent: task.progress_percent || 0,
        });
      } else {
        setForm({ ...EMPTY_FORM, status_id: defaultStatusId || '' });
      }
      setErrors({});
      setActiveTab('details');
    }
  }, [open, task, defaultStatusId]);

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/tasks/${task.id}`, data) : api.post(`/projects/${projectId}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', String(projectId)] });
      onClose();
    },
    onError: (err) => {
      if (err.response?.status === 422) setErrors(err.response.data.errors || {});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/tasks/${task.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', String(projectId)] });
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.planned_start) delete payload.planned_start;
    if (!payload.planned_end) delete payload.planned_end;
    if (!payload.due_date) delete payload.due_date;
    if (!payload.estimated_hours) delete payload.estimated_hours;
    saveMutation.mutate(payload);
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Titre *</label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
            {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title[0]}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Statut *</label>
              <Select value={form.status_id} onChange={(e) => set('status_id', Number(e.target.value))}>
                <option value="">Choisir...</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Priorité</label>
              <Select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Complexité (1-10)</label>
              <Input type="number" min={1} max={10} value={form.complexity} onChange={(e) => set('complexity', Number(e.target.value))} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Début planifié</label>
              <Input type="date" value={form.planned_start} onChange={(e) => set('planned_start', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Fin planifiée</label>
              <Input type="date" value={form.planned_end} onChange={(e) => set('planned_end', e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Échéance</label>
              <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Heures estimées</label>
              <Input type="number" step="0.5" value={form.estimated_hours} onChange={(e) => set('estimated_hours', e.target.value)} />
            </div>
            {isEdit && (
              <div>
                <label className="mb-1 block text-sm font-medium">Progression (%)</label>
                <Input type="number" min={0} max={100} value={form.progress_percent} onChange={(e) => set('progress_percent', Number(e.target.value))} />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <div>
              {isEdit && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => { if (window.confirm('Supprimer cette tâche ?')) deleteMutation.mutate(); }}
                >
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
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
    queryFn: () => api.get(`/tasks/${taskId}/comments`).then((r) => r.data.data),
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
    queryFn: () => api.get(`/tasks/${taskId}/time-entries`).then((r) => r.data.data),
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
    queryFn: () => api.get(`/tasks/${taskId}/assignees`).then((r) => r.data.data),
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
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                {(a.user?.name || '?')[0]}
              </div>
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
