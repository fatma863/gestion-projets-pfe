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
import {
  ArrowLeft, Plus, Trash2, Users, Search, FolderKanban, Calendar, X,
} from 'lucide-react';

const ROLES = [
  { value: 'lead', label: 'Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'developer', label: 'Développeur' },
  { value: 'designer', label: 'Designer' },
  { value: 'tester', label: 'Testeur' },
  { value: 'member', label: 'Membre' },
];

const STATUS_BADGE = {
  planning: { label: 'Planification', variant: 'secondary' },
  active: { label: 'Actif', variant: 'success' },
  on_hold: { label: 'En pause', variant: 'warning' },
  completed: { label: 'Terminé', variant: 'info' },
  cancelled: { label: 'Annulé', variant: 'destructive' },
};

export default function ManagerTeamDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── Member add state ───
  const [showAddMember, setShowAddMember] = useState(false);
  const [userId, setUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [role, setRole] = useState('developer');
  const [capacity, setCapacity] = useState('40');
  const userDropdownRef = useRef(null);

  // ─── Project add state ───
  const [showAddProject, setShowAddProject] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectDropdownRef = useRef(null);

  // ─── Queries ───
  const { data: team, isLoading } = useQuery({
    queryKey: ['team', id],
    queryFn: () => api.get(`/teams/${id}`).then((r) => r.data.team),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['search-users', userSearch],
    queryFn: () => api.get(`/projects/search-users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`).then((r) => r.data.users),
    enabled: showUserDropdown,
  });

  const { data: allProjects } = useQuery({
    queryKey: ['all-projects-for-team'],
    queryFn: () => api.get('/projects?per_page=200').then((r) => r.data.data),
    enabled: showAddProject,
  });

  // Filter out users/projects already in the team
  const availableUsers = (searchResults || []).filter(
    (u) => !team?.members?.some((m) => m.id === u.id)
  );
  const availableProjects = (allProjects || []).filter(
    (p) => !team?.projects?.some((tp) => tp.id === p.id)
  ).filter(
    (p) => !projectSearch || p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) setShowUserDropdown(false);
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) setShowProjectDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Mutations ───
  const invalidateTeam = () => queryClient.invalidateQueries({ queryKey: ['team', id] });

  const addMemberMutation = useMutation({
    mutationFn: (data) => api.post(`/teams/${id}/members`, data),
    onSuccess: () => { invalidateTeam(); setShowAddMember(false); setUserId(''); setSelectedUser(null); setUserSearch(''); },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (uid) => api.delete(`/teams/${id}/members/${uid}`),
    onSuccess: invalidateTeam,
  });

  const assignProjectMutation = useMutation({
    mutationFn: (projectId) => api.post(`/teams/${id}/projects`, { project_id: projectId }),
    onSuccess: () => { invalidateTeam(); queryClient.invalidateQueries({ queryKey: ['all-projects-for-team'] }); },
  });

  const removeProjectMutation = useMutation({
    mutationFn: (projectId) => api.delete(`/teams/${id}/projects/${projectId}`),
    onSuccess: () => { invalidateTeam(); queryClient.invalidateQueries({ queryKey: ['all-projects-for-team'] }); },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!team) return <div className="py-20 text-center text-muted-foreground">Équipe non trouvée</div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="mt-1 rounded-md p-1 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{team.name}</h1>
          {team.description && <p className="mt-1 text-sm text-muted-foreground">{team.description}</p>}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {team.members?.length || 0} membres</span>
            <span className="flex items-center gap-1"><FolderKanban className="h-4 w-4" /> {team.projects?.length || 0} projets</span>
          </div>
        </div>
      </div>

      {/* ═══════════════ MEMBERS SECTION ═══════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Membres de l'équipe
          </h2>
          <Button size="sm" onClick={() => setShowAddMember(!showAddMember)}>
            {showAddMember ? <><X className="mr-1 h-4 w-4" /> Annuler</> : <><Plus className="mr-1 h-4 w-4" /> Ajouter un membre</>}
          </Button>
        </div>

        {showAddMember && (
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              {/* User search with dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <label className="mb-1 block text-xs font-medium">Utilisateur</label>
                {selectedUser ? (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-accent/50 px-3 py-1.5 text-sm">
                    <Avatar name={selectedUser.name} src={selectedUser.avatar} size="xs" />
                    <span>{selectedUser.name}</span>
                    <span className="text-muted-foreground">({selectedUser.email})</span>
                    <button type="button" onClick={() => { setSelectedUser(null); setUserId(''); setUserSearch(''); }} className="ml-1 text-muted-foreground hover:text-foreground">&times;</button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}
                      className="w-64 pl-8"
                      placeholder="Rechercher un utilisateur..."
                    />
                  </div>
                )}
                {showUserDropdown && !selectedUser && (
                  <div className="absolute z-20 mt-1 max-h-52 w-80 overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                    {availableUsers.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">Aucun utilisateur disponible</div>
                    ) : (
                      availableUsers.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => { setSelectedUser(u); setUserId(u.id); setShowUserDropdown(false); setUserSearch(''); }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                        >
                          <Avatar name={u.name} src={u.avatar} size="sm" />
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
                onClick={() => addMemberMutation.mutate({ user_id: parseInt(userId), role_in_team: role, capacity_hours_per_week: parseInt(capacity) })}
                disabled={!userId || addMemberMutation.isPending}
              >
                {addMemberMutation.isPending ? 'Ajout...' : 'Ajouter'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Members list */}
        <div className="space-y-2">
          {team.members?.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aucun membre dans cette équipe</p>
              </CardContent>
            </Card>
          ) : (
            team.members?.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
                <div className="flex items-center gap-3">
                  <Avatar name={m.name} src={m.avatar} size="lg" />
                  <div>
                    <p className="font-medium text-foreground">{m.name}</p>
                    <p className="text-sm text-muted-foreground">{m.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">{ROLES.find((r) => r.value === m.role_in_team)?.label || m.role_in_team || 'Membre'}</Badge>
                  {m.capacity_hours_per_week && (
                    <span className="text-xs text-muted-foreground">{m.capacity_hours_per_week}h/sem</span>
                  )}
                  {m.skills?.length > 0 && (
                    <div className="hidden gap-1 sm:flex">
                      {m.skills.slice(0, 3).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                    </div>
                  )}
                  <button
                    onClick={() => { if (window.confirm(`Retirer ${m.name} de l'équipe ?`)) removeMemberMutation.mutate(m.id); }}
                    className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive transition-colors"
                    title="Retirer de l'équipe"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ═══════════════ PROJECTS SECTION ═══════════════ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" /> Projets de l'équipe
          </h2>
          <Button size="sm" onClick={() => setShowAddProject(!showAddProject)}>
            {showAddProject ? <><X className="mr-1 h-4 w-4" /> Annuler</> : <><Plus className="mr-1 h-4 w-4" /> Ajouter un projet</>}
          </Button>
        </div>

        {showAddProject && (
          <Card>
            <CardContent className="p-4">
              <label className="mb-1 block text-xs font-medium">Rechercher un projet à ajouter</label>
              <div className="relative" ref={projectDropdownRef}>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={projectSearch}
                    onChange={(e) => { setProjectSearch(e.target.value); setShowProjectDropdown(true); }}
                    onFocus={() => setShowProjectDropdown(true)}
                    className="w-80 pl-8"
                    placeholder="Rechercher un projet..."
                  />
                </div>
                {showProjectDropdown && (
                  <div className="absolute z-20 mt-1 max-h-60 w-96 overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                    {availableProjects.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-muted-foreground">Aucun projet disponible</div>
                    ) : (
                      availableProjects.map((p) => {
                        const statusInfo = STATUS_BADGE[p.status] || { label: p.status, variant: 'outline' };
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => { assignProjectMutation.mutate(p.id); setShowProjectDropdown(false); setProjectSearch(''); }}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-accent border-b border-border/50 last:border-0"
                            disabled={assignProjectMutation.isPending}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                                {p.code || p.name[0]}
                              </div>
                              <div>
                                <p className="font-medium">{p.name}</p>
                                {p.code && <p className="text-xs text-muted-foreground">{p.code}</p>}
                              </div>
                            </div>
                            <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Projects list */}
        {team.projects?.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <FolderKanban className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aucun projet assigné à cette équipe</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {team.projects?.map((p) => {
              const statusInfo = STATUS_BADGE[p.status] || { label: p.status, variant: 'outline' };
              return (
                <Card key={p.id} className="group relative transition-shadow hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="absolute right-2 top-2">
                      <button
                        onClick={() => { if (window.confirm(`Retirer le projet "${p.name}" de l'équipe ?`)) removeProjectMutation.mutate(p.id); }}
                        className="rounded p-1 opacity-0 text-muted-foreground hover:bg-red-50 hover:text-destructive group-hover:opacity-100 transition-all"
                        title="Retirer de l'équipe"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Link to={`/manager/projects/${p.id}`} className="block">
                      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {p.code || p.name[0]}
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{p.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusInfo.variant} className="text-[10px]">{statusInfo.label}</Badge>
                        {p.start_date && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(p.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
