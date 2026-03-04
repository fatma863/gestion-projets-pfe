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
import {
  Plus, Search, FolderKanban, Calendar, Users, MoreVertical,
  Pencil, Trash2, Eye,
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

const EMPTY_FORM = { name: '', code: '', description: '', team_id: '', status: 'planning', start_date: '', end_date: '' };

export default function ProjectsPage() {
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
      params.set('per_page', '50');
      return api.get(`/projects?${params}`).then((r) => r.data.data);
    },
  });

  const { data: teams } = useQuery({
    queryKey: ['teams-list'],
    queryFn: () => api.get('/teams?per_page=100').then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const openEdit = (project) => {
    setEditingProject(project);
    setShowForm(true);
    setMenuOpen(null);
  };

  const openCreate = () => {
    setEditingProject(null);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce projet ?')) {
      deleteMutation.mutate(id);
    }
    setMenuOpen(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projets</h1>
          <p className="text-muted-foreground">Gérez vos projets et suivez leur avancement</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau projet
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Aucun projet trouvé</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((project) => (
            <Card key={project.id} className="group relative transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="absolute right-3 top-3">
                  <button
                    onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                    className="rounded-md p-1 opacity-0 hover:bg-accent group-hover:opacity-100"
                  >
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {menuOpen === project.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-white py-1 shadow-lg">
                      <Link
                        to={`/projects/${project.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Eye className="h-4 w-4" /> Voir
                      </Link>
                      <button
                        onClick={() => openEdit(project)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Pencil className="h-4 w-4" /> Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" /> Supprimer
                      </button>
                    </div>
                  )}
                </div>

                <Link to={`/projects/${project.id}`} className="block">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">
                      {project.code}
                    </span>
                    {getStatusBadge(project.status)}
                  </div>
                  <h3 className="mb-1 font-semibold text-foreground">{project.name}</h3>
                  {project.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {project.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {project.team && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {project.team.name}
                      </span>
                    )}
                    {project.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(project.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FolderKanban className="h-3.5 w-3.5" /> {project.tasks_count || 0} tâches
                    </span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProjectFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingProject(null); }}
        project={editingProject}
        teams={teams || []}
      />
    </div>
  );
}

function ProjectFormModal({ open, onClose, project, teams }) {
  const queryClient = useQueryClient();
  const isEdit = !!project;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(project ? {
        name: project.name || '',
        code: project.code || '',
        description: project.description || '',
        team_id: project.team_id || '',
        status: project.status || 'planning',
        start_date: project.start_date || '',
        end_date: project.end_date || '',
      } : { ...EMPTY_FORM });
      setErrors({});
    }
  }, [open, project]);

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.put(`/projects/${project.id}`, data) : api.post('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
    onError: (err) => {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      }
    },
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Équipe</label>
            <Select value={form.team_id} onChange={(e) => set('team_id', e.target.value)}>
              <option value="">Aucune</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
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
