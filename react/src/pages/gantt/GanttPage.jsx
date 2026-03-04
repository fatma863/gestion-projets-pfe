import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { BarChart3 } from 'lucide-react';

const PRIORITY_COLORS = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#f97316',
  urgent: '#ef4444',
};

export default function GanttPage() {
  const [selectedProject, setSelectedProject] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-for-gantt'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: ganttData, isLoading } = useQuery({
    queryKey: ['gantt', selectedProject],
    queryFn: () => api.get(`/projects/${selectedProject}/gantt`).then((r) => r.data.gantt),
    enabled: !!selectedProject,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Diagramme de Gantt</h1>
        <p className="text-muted-foreground">Visualisez la chronologie de vos projets</p>
      </div>

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
      ) : !ganttData || ganttData.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Aucune tâche avec des dates planifiées
          </CardContent>
        </Card>
      ) : (
        <GanttChart tasks={ganttData} />
      )}
    </div>
  );
}

function GanttChart({ tasks }) {
  const { minDate, maxDate, totalDays, months } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    tasks.forEach((t) => {
      if (t.start) min = Math.min(min, new Date(t.start).getTime());
      if (t.end) max = Math.max(max, new Date(t.end).getTime());
    });
    // Add padding
    const pad = 2 * 86400000;
    min -= pad;
    max += pad;
    const totalDays = Math.ceil((max - min) / 86400000);
    const minD = new Date(min);
    const maxD = new Date(max);

    // Build month markers
    const months = [];
    const cursor = new Date(minD.getFullYear(), minD.getMonth(), 1);
    while (cursor <= maxD) {
      const offset = Math.max(0, (cursor.getTime() - min) / 86400000);
      months.push({
        label: cursor.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
        offset,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return { minDate: min, maxDate: max, totalDays, months };
  }, [tasks]);

  const getBarStyle = (task) => {
    if (!task.start || !task.end) return null;
    const startOffset = (new Date(task.start).getTime() - minDate) / 86400000;
    const duration = Math.max(1, (new Date(task.end).getTime() - new Date(task.start).getTime()) / 86400000);
    const left = (startOffset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      {/* Month headers */}
      <div className="relative h-8 border-b border-border bg-accent/30">
        {months.map((m, i) => (
          <div
            key={i}
            className="absolute top-0 border-l border-border px-2 text-xs font-medium text-muted-foreground leading-8"
            style={{ left: `${(m.offset / totalDays) * 100}%` }}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div>
        {tasks.map((task) => {
          const barStyle = getBarStyle(task);
          return (
            <div key={task.id} className="flex border-b border-border last:border-0">
              {/* Task name */}
              <div className="flex w-56 flex-shrink-0 items-center gap-2 border-r border-border px-3 py-2">
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: task.status_color || '#6b7280' }}
                />
                <span className="truncate text-sm text-foreground" title={task.name}>
                  {task.name}
                </span>
              </div>

              {/* Bar area */}
              <div className="relative flex-1 py-2" style={{ minHeight: '36px' }}>
                {barStyle ? (
                  <div
                    className="absolute top-2 h-6 rounded"
                    style={{
                      ...barStyle,
                      backgroundColor: PRIORITY_COLORS[task.priority] || '#6366f1',
                      opacity: 0.85,
                    }}
                  >
                    {/* Progress fill */}
                    {task.progress > 0 && (
                      <div
                        className="h-full rounded bg-black/20"
                        style={{ width: `${task.progress}%` }}
                      />
                    )}
                    {/* Label */}
                    <span className="absolute inset-0 flex items-center px-2 text-xs font-medium text-white truncate">
                      {task.progress}%
                    </span>
                  </div>
                ) : (
                  <div className="flex h-6 items-center px-2">
                    <span className="text-xs text-muted-foreground italic">Pas de dates</span>
                  </div>
                )}

                {/* Dependency arrows rendered as simple markers */}
                {task.dependencies?.map((dep) => (
                  <div
                    key={dep.id}
                    className="absolute top-1 h-1 w-1 rounded-full bg-muted-foreground"
                    style={{ left: '0%' }}
                    title={`Dépend de tâche #${dep.id} (${dep.type})`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-3 py-2">
        {Object.entries(PRIORITY_COLORS).map(([key, color]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
            {key === 'low' ? 'Basse' : key === 'medium' ? 'Moyenne' : key === 'high' ? 'Haute' : 'Urgente'}
          </div>
        ))}
      </div>
    </div>
  );
}
