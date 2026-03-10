import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { useSprints, useCreateSprint, useDeleteSprint } from '../../hooks/useSprints';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { Plus, Layers, Calendar, Target, Trash2, ChevronRight, ListTodo } from 'lucide-react';

const STATUS_MAP = {
  planned: { label: 'Planifié', variant: 'secondary' },
  active: { label: 'Actif', variant: 'success' },
  completed: { label: 'Terminé', variant: 'default' },
};

export default function ManagerSprintListPage() {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-sprints'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: sprints, isLoading } = useSprints(selectedProject);
  const deleteMutation = useDeleteSprint(selectedProject);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprints"
        description="Gérez les sprints de vos projets"
        actions={
          selectedProject && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/manager/backlog?project=${selectedProject}`)}>
                <Layers className="mr-2 h-4 w-4" /> Backlog
              </Button>
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" /> Nouveau sprint
              </Button>
            </div>
          )
        }
      />

      <div className="max-w-xs">
        <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">Sélectionner un projet</option>
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {!selectedProject ? (
        <EmptyState icon={Layers} title="Sélectionnez un projet" description="Choisissez un projet pour voir ses sprints" />
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !sprints?.length ? (
        <EmptyState icon={Layers} title="Aucun sprint" description="Créez votre premier sprint pour ce projet" action={() => setShowCreate(true)} actionLabel="Créer un sprint" />
      ) : (
        <div className="space-y-3">
          {sprints.map((sprint, i) => (
            <motion.div key={sprint.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="group transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={STATUS_MAP[sprint.status]?.variant || 'outline'}>
                          {STATUS_MAP[sprint.status]?.label || sprint.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ListTodo className="h-3.5 w-3.5" /> {sprint.tasks_count || 0} tâches
                        </span>
                      </div>
                      <Link to={`/manager/sprints/${sprint.id}?project=${selectedProject}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors">
                        {sprint.name}
                      </Link>
                      {sprint.goal && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{sprint.goal}</p>}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {sprint.start_date} → {sprint.end_date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { if (window.confirm('Supprimer ce sprint ?')) deleteMutation.mutate(sprint.id); }}
                        className="rounded-md p-1.5 text-muted-foreground opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <Link to={`/manager/sprints/${sprint.id}?project=${selectedProject}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <ChevronRight className="h-5 w-5" />
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {selectedProject && (
        <SprintFormModal open={showCreate} onClose={() => setShowCreate(false)} projectId={selectedProject} />
      )}
    </div>
  );
}

function SprintFormModal({ open, onClose, projectId }) {
  const [form, setForm] = useState({ name: '', goal: '', start_date: '', end_date: '', status: 'planned' });
  const [errors, setErrors] = useState({});
  const createMutation = useCreateSprint(projectId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    createMutation.mutate(form, {
      onSuccess: () => { onClose(); setForm({ name: '', goal: '', start_date: '', end_date: '', status: 'planned' }); },
      onError: (err) => {
        if (err.response?.status === 422) setErrors(err.response.data.errors || {});
      },
    });
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Modal open={open} onClose={onClose} title="Nouveau sprint">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nom *</label>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Sprint 1" />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Objectif</label>
          <Textarea value={form.goal} onChange={(e) => set('goal', e.target.value)} rows={3} placeholder="Décrivez l'objectif de ce sprint..." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Date de début *</label>
            <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
            {errors.start_date && <p className="mt-1 text-xs text-destructive">{errors.start_date[0]}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Date de fin *</label>
            <Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} />
            {errors.end_date && <p className="mt-1 text-xs text-destructive">{errors.end_date[0]}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Création...' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
