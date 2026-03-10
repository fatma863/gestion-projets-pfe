import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useBacklog } from '../../hooks/useSprints';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar, AvatarGroup } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';
import { Layers, ListTodo } from 'lucide-react';

const PRIORITY_MAP = {
  low: { label: 'Basse', variant: 'secondary' },
  medium: { label: 'Moyenne', variant: 'info' },
  high: { label: 'Haute', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

export default function MemberBacklogPage() {
  const [searchParams] = useSearchParams();
  const projectParam = searchParams.get('project');
  const [selectedProject, setSelectedProject] = useState(projectParam || '');

  const { data: projects } = useQuery({
    queryKey: ['projects-for-backlog'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: tasks, isLoading } = useBacklog(selectedProject);

  return (
    <div className="space-y-6">
      <PageHeader title="Backlog" description="Tâches non assignées à un sprint" back />

      <div className="max-w-xs">
        <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
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
            <CardTitle>{tasks.length} tâches dans le backlog</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <motion.div key={task.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors"
                >
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
                        <span className="flex items-center gap-1">
                          <AvatarGroup users={task.assignees} max={3} size="xs" />
                          <span className="truncate max-w-[120px]">{task.assignees.map((a) => a.user?.name || a.name).join(', ')}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
