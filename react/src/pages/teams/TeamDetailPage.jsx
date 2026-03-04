import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent } from '../../components/ui/Card';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';

const ROLES = [
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'developer', label: 'Développeur' },
  { value: 'designer', label: 'Designer' },
  { value: 'tester', label: 'Testeur' },
  { value: 'member', label: 'Membre' },
];

export default function TeamDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('developer');
  const [capacity, setCapacity] = useState('40');

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then((r) => r.data.data),
  });

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/teams/${id}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      setShowAdd(false);
      setUserId('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (uid) => api.delete(`/teams/${id}/members/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', id] }),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }

  if (!team) {
    return <div className="py-20 text-center text-muted-foreground">Équipe non trouvée</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link to="/teams" className="mt-1 rounded-md p-1 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>{team.members_count || team.members?.length || 0} membres</span>
            <span>{team.projects_count || 0} projets</span>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Membres</h2>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter un membre
          </Button>
        </div>

        {showAdd && (
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium">ID utilisateur</label>
                <Input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} className="w-24" placeholder="ID" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Rôle</label>
                <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-36">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Capacité (h/sem)</label>
                <Input type="number" min={0} max={60} value={capacity} onChange={(e) => setCapacity(e.target.value)} className="w-24" />
              </div>
              <Button
                size="sm"
                onClick={() => addMutation.mutate({
                  user_id: parseInt(userId),
                  role_in_team: role,
                  capacity_hours_per_week: parseInt(capacity),
                })}
                disabled={!userId || addMutation.isPending}
              >
                Ajouter
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {team.members?.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun membre dans cette équipe</p>
              </CardContent>
            </Card>
          )}
          {team.members?.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {m.name?.[0] || '?'}
                </div>
                <div>
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">{m.role_in_team || 'member'}</Badge>
                {m.capacity_hours_per_week && (
                  <span className="text-xs text-muted-foreground">{m.capacity_hours_per_week}h/sem</span>
                )}
                {m.skills?.length > 0 && (
                  <div className="hidden gap-1 sm:flex">
                    {m.skills.slice(0, 3).map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (window.confirm('Retirer ce membre ?')) removeMutation.mutate(m.id);
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
