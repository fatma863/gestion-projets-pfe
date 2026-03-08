import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { PageHeader } from '../../components/ui/PageHeader';
import { BarChart3 } from 'lucide-react';
import GanttChart from '../../components/gantt/GanttChart';

export default function GanttPage() {
  const [selectedProject, setSelectedProject] = useState('');
  const queryClient = useQueryClient();

  const { data: projects } = useQuery({
    queryKey: ['projects-for-gantt'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: ganttResponse, isLoading } = useQuery({
    queryKey: ['gantt', selectedProject],
    queryFn: () => api.get(`/projects/${selectedProject}/gantt`).then((r) => r.data),
    enabled: !!selectedProject,
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, start, end }) =>
      api.put(`/projects/${selectedProject}/gantt/tasks/${taskId}`, { planned_start: start, planned_end: end }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['gantt', selectedProject] }),
  });

  const handleTaskUpdate = (taskId, start, end) => {
    updateMutation.mutate({ taskId, start, end });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Diagramme de Gantt" description="Visualisez et gérez la chronologie de vos projets" />

      <div className="max-w-xs">
        <Select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">Sélectionner un projet</option>
          {projects?.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
          ))}
        </Select>
      </div>

      {!selectedProject ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Sélectionnez un projet pour afficher le diagramme de Gantt</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : !ganttResponse?.gantt?.length ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucune tâche avec des dates planifiées
          </CardContent>
        </Card>
      ) : (
        <GanttChart
          tasks={ganttResponse.gantt}
          criticalPath={ganttResponse.critical_path}
          workload={ganttResponse.workload}
          readOnly={false}
          onTaskUpdate={handleTaskUpdate}
          projectId={selectedProject}
        />
      )}
    </div>
  );
}
