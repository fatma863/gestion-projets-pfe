import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useBacklog, useSprints, useAddTasksToSprint } from '../../hooks/useSprints';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { AvatarGroup } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';
import { Layers, ArrowRight, ListTodo, Users, Target } from 'lucide-react';

const PRIORITY_MAP = {
  low: { label: 'Basse', variant: 'secondary' },
  medium: { label: 'Moyenne', variant: 'info' },
  high: { label: 'Haute', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

export default function ManagerBacklogPage() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project');
  const [selectedProject, setSelectedProject] = useState(projectParam || '');
  const [selected, setSelected] = useState([]);
  const [showMoveModal, setShowMoveModal] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ['projects-for-backlog'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: tasks, isLoading } = useBacklog(selectedProject);
  const { data: sprints } = useSprints(selectedProject);

  const toggle = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () => {
    if (selected.length === tasks?.length) setSelected([]);
    else setSelected(tasks?.map((t) => t.id) || []);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backlog"
        description="Tâches non assignées à un sprint"
        back
        actions={
          selected.length > 0 && (
            <Button onClick={() => setShowMoveModal(true)}>
              <ArrowRight className="mr-2 h-4 w-4" /> Déplacer vers un sprint ({selected.length})
            </Button>
          )
        }
      />

      <div className="max-w-xs">
        <Select value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); setSelected([]); }}>
          <option value="">Sélectionner un projet</option>
          {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>

      {!selectedProject ? (
        <EmptyState icon={Layers} title="Sélectionnez un projet" description="Choisissez un projet pour voir son backlog" />
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !tasks?.length ? (
        <EmptyState icon={ListTodo} title="Backlog vide" description="Toutes les tâches sont dans un sprint ou le projet n'a pas de tâches" />
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{tasks.length} tâches dans le backlog</CardTitle>
              <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                {selected.length === tasks.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <motion.label key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                >
                  <input type="checkbox" checked={selected.includes(task.id)} onChange={() => toggle(task.id)} className="h-4 w-4 rounded border-gray-300" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">{task.title}</span>
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
                    </div>
                  </div>
                </motion.label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <MoveToSprintModal
        open={showMoveModal}
        onClose={() => setShowMoveModal(false)}
        sprints={sprints || []}
        taskIds={selected}
        projectId={selectedProject}
        onDone={() => { setSelected([]); setShowMoveModal(false); }}
      />
    </div>
  );
}

function MoveToSprintModal({ open, onClose, sprints, taskIds, projectId, onDone }) {
  const [targetSprint, setTargetSprint] = useState('');
  const addMutation = useAddTasksToSprint(projectId);

  const handleMove = () => {
    if (!targetSprint || !taskIds.length) return;
    addMutation.mutate({ sprintId: targetSprint, taskIds }, { onSuccess: onDone });
  };

  return (
    <Modal open={open} onClose={onClose} title="Déplacer vers un sprint">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{taskIds.length} tâche(s) sélectionnée(s)</p>
        <Select value={targetSprint} onChange={(e) => setTargetSprint(e.target.value)}>
          <option value="">Choisir un sprint</option>
          {sprints.filter((s) => s.status !== 'completed').map((s) => (
            <option key={s.id} value={s.id}>{s.name} ({s.status === 'active' ? 'Actif' : 'Planifié'})</option>
          ))}
        </Select>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleMove} disabled={!targetSprint || addMutation.isPending}>
            {addMutation.isPending ? 'Déplacement...' : 'Déplacer'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
