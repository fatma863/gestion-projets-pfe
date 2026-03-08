import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { ArrowLeft, Users } from 'lucide-react';

export default function MemberTeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: team, isLoading } = useQuery({ queryKey: ['team', id], queryFn: () => api.get(`/teams/${id}`).then((r) => r.data.team) });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!team) return <div className="py-20 text-center text-muted-foreground">Équipe non trouvée</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 rounded-md p-1 hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{team.members_count || team.members?.length || 0} membres</span>
            <span>{team.projects_count || 0} projets</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Membres</h2>
        <div className="space-y-2">
          {team.members?.length === 0 && (
            <Card><CardContent className="py-10 text-center"><Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="text-sm text-muted-foreground">Aucun membre</p></CardContent></Card>
          )}
          {team.members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">{m.name?.[0] || '?'}</div>
                <div><p className="font-medium text-foreground">{m.name}</p><p className="text-sm text-muted-foreground">{m.email}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{m.role_in_team || 'member'}</Badge>
                {m.capacity_hours_per_week && <span className="text-xs text-muted-foreground">{m.capacity_hours_per_week}h/sem</span>}
                {m.skills?.length > 0 && <div className="hidden gap-1 sm:flex">{m.skills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
