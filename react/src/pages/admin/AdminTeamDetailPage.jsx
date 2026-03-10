import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { ArrowLeft, Plus, Trash2, Users, Search, FolderKanban } from 'lucide-react';

const ROLES = [
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'developer', label: 'Développeur' },
  { value: 'designer', label: 'Designer' },
  { value: 'tester', label: 'Testeur' },
  { value: 'member', label: 'Membre' },
];

export default function AdminTeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [userId, setUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [role, setRole] = useState('developer');
  const [capacity, setCapacity] = useState('40');
  const dropdownRef = useRef(null);

  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then((r) => r.data.team),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['search-users', userSearch],
    queryFn: () => api.get(`/projects/search-users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`).then((r) => r.data.users),
    enabled: showDropdown,
  });

  const availableUsers = (searchResults || []).filter(
    (u) => !team?.members?.some((m) => m.id === u.id)
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addMutation = useMutation({
    mutationFn: (data) => api.post(`/teams/${id}/members`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', id] });
      setShowAdd(false);
      setUserId('');
      setSelectedUser(null);
      setUserSearch('');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (uid) => api.delete(`/teams/${id}/members/${uid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!team) return <div className="py-20 text-center text-muted-foreground">Équipe non trouvée</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/admin/teams')} className="mt-1 rounded-md p-1 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {team.members_count || team.members?.length || 0} membres</span>
            <span className="flex items-center gap-1"><FolderKanban className="h-4 w-4" /> {team.projects_count || 0} projets</span>
          </div>
        </div>
      </div>

      {/* Members section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Membres de l'équipe</h2>
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter un membre
          </Button>
        </div>

        {showAdd && (
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="relative" ref={dropdownRef}>
                <label className="mb-1 block text-xs font-medium">Utilisateur</label>
                {selectedUser ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-1.5 text-sm">
                    <Avatar name={selectedUser.name} src={selectedUser.avatar} size="xs" />
                    <span>{selectedUser.name}</span>
                    <span className="text-muted-foreground">({selectedUser.email})</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedUser(null); setUserId(''); setUserSearch(''); }}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >&times;</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-60 pl-8"
                      placeholder="Rechercher un utilisateur..."
                    />
                  </div>
                )}
                {showDropdown && !selectedUser && (
                  <div className="absolute z-20 mt-1 max-h-48 w-72 overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                    {availableUsers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Aucun utilisateur trouvé</div>
                    ) : (
                      availableUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedUser(u); setUserId(u.id); setShowDropdown(false); setUserSearch(''); }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <Avatar name={u.name} src={u.avatar} size="xs" />
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
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
                onClick={() => addMutation.mutate({ user_id: parseInt(userId), role_in_team: role, capacity_hours_per_week: parseInt(capacity) })}
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
                <Avatar name={m.name} src={m.avatar} size="md" />
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
                    {m.skills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                )}
                <button
                  onClick={() => { if (window.confirm('Retirer ce membre de l\'équipe ?')) removeMutation.mutate(m.id); }}
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
