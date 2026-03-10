import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useSprints } from '../../hooks/useSprints';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { Layers, Calendar, ChevronRight, ListTodo } from 'lucide-react';

const STATUS_MAP = {
  planned: { label: 'Planifié', variant: 'secondary' },
  active: { label: 'Actif', variant: 'success' },
  completed: { label: 'Terminé', variant: 'default' },
};

export default function MemberSprintListPage() {
  const [selectedProject, setSelectedProject] = useState('');

  const { data: projects } = useQuery({
    queryKey: ['projects-for-sprints'],
    queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data),
  });

  const { data: sprints, isLoading } = useSprints(selectedProject);

  return (
    <div className="space-y-6">
      <PageHeader title="Sprints" description="Consultez les sprints de vos projets" />

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
        <EmptyState icon={Layers} title="Aucun sprint" description="Ce projet n'a pas encore de sprints" />
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
                      <Link to={`/app/sprints/${sprint.id}?project=${selectedProject}`} className="text-base font-semibold text-foreground hover:text-primary transition-colors">
                        {sprint.name}
                      </Link>
                      {sprint.goal && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{sprint.goal}</p>}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {sprint.start_date} → {sprint.end_date}</span>
                      </div>
                    </div>
                    <Link to={`/app/sprints/${sprint.id}?project=${selectedProject}`} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                      <ChevronRight className="h-5 w-5" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
