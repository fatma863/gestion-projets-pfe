import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { PageHeader } from '../../components/ui/PageHeader';
import { AvatarGroup } from '../../components/ui/Avatar';
import { Search, Users } from 'lucide-react';

export default function MemberTeamsPage() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['teams', { search }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('per_page', '50');
      return api.get(`/teams?${params}`).then((r) => r.data.data);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Équipes" description="Les équipes auxquelles vous appartenez" />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher une équipe..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">Aucune équipe trouvée</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((team) => (
            <Link key={team.id} to={`/app/teams/${team.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md h-full">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">{team.name[0]}</div>
                  <h3 className="mb-1 font-semibold text-foreground">{team.name}</h3>
                  {team.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{team.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {team.members_count || 0} membres</span>
                    <span>{team.projects_count || 0} projets</span>
                  </div>
                  {team.members?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <AvatarGroup users={team.members} max={5} size="sm" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
