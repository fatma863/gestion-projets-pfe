import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { PageHeader } from '../../components/ui/PageHeader';
import { ReadOnlyBanner } from '../../components/shared/ReadOnlyBanner';
import { motion } from 'framer-motion';
import { Search, FolderKanban, Users, ListTodo, UserCheck } from 'lucide-react';

const STATUS_LABELS = { planning: 'Planification', active: 'Actif', on_hold: 'En pause', completed: 'Terminé', cancelled: 'Annulé' };
const STATUS_VARIANTS = { planning: 'secondary', active: 'success', on_hold: 'warning', completed: 'default', cancelled: 'destructive' };

export default function ViewerProjectsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('per_page', '50');
      return api.get(`/projects?${params}`).then((r) => r.data.data);
    },
  });

  return (
    <div className="space-y-6">
      <ReadOnlyBanner />
      <PageHeader title="Projets" description="Consultation des projets (lecture seule)" />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher un projet..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">Aucun projet trouvé</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/app/projects/${project.id}`}>
                <Card className="cursor-pointer transition-shadow hover:shadow-md h-full">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{project.code}</Badge>
                      <Badge variant={STATUS_VARIANTS[project.status] || 'outline'}>{STATUS_LABELS[project.status] || project.status}</Badge>
                    </div>
                    <h3 className="mb-1 font-semibold text-foreground">{project.name}</h3>
                    {project.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>}
                    <ProgressBar value={project.progress_percent || 0} size="sm" showValue className="mb-2" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {project.manager && <span className="flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> {project.manager.name}</span>}
                      {project.team && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {project.team.name}</span>}
                      <span className="flex items-center gap-1"><ListTodo className="h-3.5 w-3.5" /> {project.tasks_count || 0} tâches</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
