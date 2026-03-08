import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import {
  Plus, Search, FolderKanban, Calendar, Users, MoreVertical,
  Pencil, Trash2, Eye, BarChart3, AlertTriangle,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planification', variant: 'secondary' },
  { value: 'active', label: 'Actif', variant: 'success' },
  { value: 'on_hold', label: 'En pause', variant: 'warning' },
  { value: 'completed', label: 'Terminé', variant: 'default' },
  { value: 'cancelled', label: 'Annulé', variant: 'destructive' },
];

function getStatusBadge(status) {
  const opt = STATUS_OPTIONS.find((s) => s.value === status);
  return opt ? <Badge variant={opt.variant}>{opt.label}</Badge> : <Badge>{status}</Badge>;
}

const EMPTY_FORM = { name: '', code: '', description: '', team_id: '', status: 'planning', start_date: '', end_date: '', manager_id: '' };

export default function AdminProjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: filterStatus }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      params.set('per_page', '100');
      return api.get(`/projects?${params}`).then((r) => r.data.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const projects = data || [];
  const activeCount = projects.filter((p) => p.status === 'active').length;
  const overdueCount = projects.filter((p) => p.end_date && new Date(p.end_date) < new Date() && p.status !== 'completed').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tous les projets"
        description="Administration globale de tous les projets de la plateforme"
        actions={
          <Button onClick={() => { setEditingProject(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau projet
          </Button>
        }
      />

      {/* Vue consolidée admin */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={FolderKanban} label="Total projets" value={projects.length} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={BarChart3} label="Actifs" value={activeCount} color="bg-emerald-50 text-emerald-600" />
        <MetricCard icon={AlertTriangle} label="En retard" value={overdueCount} color={overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-muted/50 text-muted-foreground'} />
      </div>

      {/* Filtres */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un projet..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : projects.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">Aucun projet trouvé</p></CardContent></Card>
      ) : (
        /* Vue tableau admin */
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Projet</th>
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Manager</th>
                  <th className="px-4 py-3 text-left font-medium">Équipe</th>
                  <th className="px-4 py-3 text-left font-medium">Tâches</th>
                  <th className="px-4 py-3 text-left font-medium">Période</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to={`/admin/projects/${project.id}`} className="font-medium text-foreground hover:text-primary">
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="font-mono text-xs">{project.code}</Badge></td>
                    <td className="px-4 py-3">{getStatusBadge(project.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{project.manager?.name || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{project.team?.name || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{project.tasks_count || 0}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '-'}
                      {project.end_date && <> → {new Date(project.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/projects/${project.id}`} className="rounded p-1 hover:bg-accent" title="Voir"><Eye size={16} className="text-muted-foreground" /></Link>
                        <button onClick={() => { setEditingProject(project); setShowForm(true); }} className="rounded p-1 hover:bg-accent" title="Modifier"><Pencil size={16} className="text-muted-foreground" /></button>
                        <button onClick={() => { if (window.confirm('Supprimer ce projet ?')) deleteMutation.mutate(project.id); }} className="rounded p-1 hover:bg-destructive/10" title="Supprimer"><Trash2 size={16} className="text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <ProjectFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingProject(null); }}
        project={editingProject}
      />
    </div>
  );
}

function ProjectFormModal({ open, onClose, project }) {
  const queryClient = useQueryClient();
  const isEdit = !!project;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const { data: teams } = useQuery({
    queryKey: ['teams-list'],
    queryFn: () => api.get('/teams?per_page=100').then((r) => r.data.data),
  });

  const { data: managers } = useQuery({
    queryKey: ['managers-list'],
    queryFn: () => api.get('/projects/managers').then((r) => r.data.managers),
  });

  useEffect(() => {
    if (open) {
      setForm(project ? {
        name: project.name || '', code: project.code || '', description: project.description || '',
        team_id: project.team_id || '', status: project.status || 'planning',
        start_date: project.start_date || '', end_date: project.end_date || '',
        manager_id: project.manager_id || '',
      } : { ...EMPTY_FORM });
      setErrors({});
    }
  }, [open, project]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/projects/${project.id}`, data) : api.post('/projects', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); onClose(); },
    onError: (err) => { if (err.response?.status === 422) setErrors(err.response.data.errors || {}); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.team_id) delete payload.team_id;
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    mutation.mutate(payload);
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le projet' : 'Nouveau projet'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom *</label>
            <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name[0]}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Code *</label>
            <Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={10} />
            {errors.code && <p className="mt-1 text-xs text-destructive">{errors.code[0]}</p>}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Manager responsable *</label>
          <Select value={form.manager_id} onChange={(e) => set('manager_id', e.target.value)}>
            <option value="">Sélectionner un manager</option>
            {(managers || []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
          {errors.manager_id && <p className="mt-1 text-xs text-destructive">{errors.manager_id[0]}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Équipe</label>
            <Select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}>
              <option value="">Aucune</option>
              {(teams || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Statut</label>
            <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Date de début</label>
            <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date de fin</label>
            <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
