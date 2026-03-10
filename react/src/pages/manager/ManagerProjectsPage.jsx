import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { PageHeader } from '../../components/ui/PageHeader';
import { Avatar } from '../../components/ui/Avatar';
import { motion } from 'framer-motion';
import {
  Plus, Search, FolderKanban, Calendar, Users, MoreVertical,
  Pencil, Trash2, Eye, ListTodo, UserCheck, Info,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planification', variant: 'secondary' },
  { value: 'active', label: 'Actif', variant: 'success' },
  { value: 'on_hold', label: 'En pause', variant: 'warning' },
  { value: 'completed', label: 'Terminé', variant: 'default' },
  { value: 'cancelled', label: 'Annulé', variant: 'destructive' },
];

const EMPTY_FORM = { name: '', code: '', description: '', team_id: '', status: 'planning', start_date: '', end_date: '' };

export default function ManagerProjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { search, status: filterStatus }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      params.set('per_page', '50');
      return api.get(`/projects?${params}`).then((r) => r.data.data);
    },
  });

  const { data: teams } = useQuery({ queryKey: ['teams-list'], queryFn: () => api.get('/teams?per_page=100').then((r) => r.data.data) });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes projets"
        description="Gérez et pilotez vos projets"
        actions={
          <Button onClick={() => { setEditingProject(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nouveau projet
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher un projet..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : data?.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><FolderKanban className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">Aucun projet trouvé</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((project, i) => (
            <motion.div key={project.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="group relative transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="absolute right-3 top-3">
                    <button onClick={() => setMenuOpen(menuOpen === project.id ? null : project.id)} className="rounded-md p-1 opacity-0 hover:bg-accent group-hover:opacity-100">
                      <MoreVertical className="h-4 w-4 text-muted-foreground" />
                    </button>
                    {menuOpen === project.id && (
                      <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-white py-1 shadow-lg">
                        <Link to={`/manager/projects/${project.id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Eye className="h-4 w-4" /> Voir</Link>
                        <button onClick={() => { setEditingProject(project); setShowForm(true); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Pencil className="h-4 w-4" /> Modifier</button>
                        <button onClick={() => { if (window.confirm('Supprimer ce projet ?')) deleteMutation.mutate(project.id); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /> Supprimer</button>
                      </div>
                    )}
                  </div>
                  <Link to={`/manager/projects/${project.id}`} className="block">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{project.code}</Badge>
                      <Badge variant={STATUS_OPTIONS.find((s) => s.value === project.status)?.variant || 'outline'}>
                        {STATUS_OPTIONS.find((s) => s.value === project.status)?.label || project.status}
                      </Badge>
                    </div>
                    <h3 className="mb-1 font-semibold text-foreground">{project.name}</h3>
                    {project.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{project.description}</p>}
                    <ProgressBar value={project.progress_percent || 0} size="sm" showValue className="mb-2" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {project.manager && <span className="flex items-center gap-1"><Avatar name={project.manager.name} src={project.manager.avatar} size="xs" /> {project.manager.name}</span>}
                      {project.team && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {project.team.name}</span>}
                      <span className="flex items-center gap-1"><ListTodo className="h-3.5 w-3.5" /> {project.tasks_count || 0} tâches</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <ProjectFormModal open={showForm} onClose={() => { setShowForm(false); setEditingProject(null); }} project={editingProject} teams={teams || []} />
    </div>
  );
}

function ProjectFormModal({ open, onClose, project, teams }) {
  const queryClient = useQueryClient();
  const isEdit = !!project;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  // Team member preview
  const [selectedTeamMembers, setSelectedTeamMembers] = useState([]);

  // Individual user search
  const [userSearch, setUserSearch] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [extraMembers, setExtraMembers] = useState([]);
  const userDropdownRef = useRef(null);

  const { data: teamDetail } = useQuery({
    queryKey: ['team-detail-for-form', form.team_id],
    queryFn: () => api.get(`/teams/${form.team_id}`).then((r) => r.data.team),
    enabled: !!form.team_id && !isEdit,
  });

  const { data: searchUsers } = useQuery({
    queryKey: ['search-users-manager', userSearch],
    queryFn: () => api.get(`/projects/search-users${userSearch ? `?search=${encodeURIComponent(userSearch)}` : ''}`).then((r) => r.data.users),
    enabled: showUserDropdown,
  });

  // Filter out users already selected as extra members or in team
  const teamMemberIds = (teamDetail?.members || []).map((m) => m.id);
  const extraMemberIds = extraMembers.map((m) => m.id);
  const availableUsers = (searchUsers || []).filter(
    (u) => !extraMemberIds.includes(u.id) && !teamMemberIds.includes(u.id)
  );

  useEffect(() => {
    if (open) {
      setForm(project ? { name: project.name || '', code: project.code || '', description: project.description || '', team_id: project.team_id || '', status: project.status || 'planning', start_date: project.start_date || '', end_date: project.end_date || '' } : { ...EMPTY_FORM });
      setErrors({});
      setSelectedTeamMembers([]);
      setExtraMembers([]);
      setUserSearch('');
    }
  }, [open, project]);

  // When team detail loads, auto-select all members
  useEffect(() => {
    if (teamDetail?.members && !isEdit) {
      setSelectedTeamMembers(teamDetail.members.map((m) => m.id));
    }
  }, [teamDetail, isEdit]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/projects/${project.id}`, data) : api.post('/projects', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['projects'] }); onClose(); },
    onError: (err) => {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors || {});
      } else {
        setErrors({ general: [err.response?.data?.message || 'Une erreur est survenue.'] });
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.team_id) delete payload.team_id;
    if (!payload.start_date) delete payload.start_date;
    if (!payload.end_date) delete payload.end_date;
    if (!isEdit) {
      // Combine team members + extra individual members
      const allMemberIds = [...selectedTeamMembers, ...extraMemberIds];
      if (allMemberIds.length > 0) payload.member_ids = [...new Set(allMemberIds)];
    }
    mutation.mutate(payload);
  };

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier le projet' : 'Nouveau projet'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errors.general[0]}
          </div>
        )}
        {!isEdit && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Ce projet vous sera automatiquement attribué comme manager responsable.</span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-sm font-medium">Nom *</label><Input value={form.name} onChange={(e) => set('name', e.target.value)} />{errors.name && <p className="mt-1 text-xs text-destructive">{errors.name[0]}</p>}</div>
          <div><label className="mb-1 block text-sm font-medium">Code *</label><Input value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} maxLength={10} />{errors.code && <p className="mt-1 text-xs text-destructive">{errors.code[0]}</p>}</div>
        </div>
        <div><label className="mb-1 block text-sm font-medium">Description</label><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-sm font-medium">Statut</label><Select value={form.status} onChange={(e) => set('status', e.target.value)}>{STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
          <div>
            <label className="mb-1 block text-sm font-medium">Équipe (optionnel)</label>
            <Select value={form.team_id} onChange={(e) => { set('team_id', e.target.value); setSelectedTeamMembers([]); }}>
              <option value="">Aucune équipe</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            {errors.team_id && <p className="mt-1 text-xs text-destructive">{errors.team_id[0]}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="mb-1 block text-sm font-medium">Date de début</label><Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} /></div>
          <div><label className="mb-1 block text-sm font-medium">Date de fin</label><Input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} /></div>
        </div>

        {/* === Team Members (when team selected) === */}
        {!isEdit && form.team_id && teamDetail?.members?.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium">Membres de l'équipe</label>
              <button type="button" onClick={() => setSelectedTeamMembers(teamDetail.members.map((m) => m.id))} className="text-xs text-primary hover:underline">Tout sélectionner</button>
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {teamDetail.members.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-accent">
                  <input type="checkbox" checked={selectedTeamMembers.includes(m.id)} onChange={() => setSelectedTeamMembers((prev) => prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id])} className="h-4 w-4 rounded border-gray-300" />
                  <Avatar name={m.name} src={m.avatar} size="xs" />
                  <span className="text-sm">{m.name}</span>
                  <span className="text-xs text-muted-foreground">({m.role_in_team})</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* === Extra Individual Users (always available) === */}
        {!isEdit && (
          <div>
            <label className="mb-1 block text-sm font-medium">Ajouter des utilisateurs individuels</label>
            {extraMembers.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {extraMembers.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
                    <Avatar name={m.name} src={m.avatar} size="xs" />
                    {m.name}
                    <button type="button" onClick={() => setExtraMembers((prev) => prev.filter((p) => p.id !== m.id))} className="ml-0.5 text-muted-foreground hover:text-foreground">&times;</button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative" ref={userDropdownRef}>
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                onFocus={() => setShowUserDropdown(true)}
                className="pl-8"
                placeholder="Rechercher des utilisateurs à ajouter..."
              />
              {showUserDropdown && (
                <div className="absolute z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                  {availableUsers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Aucun utilisateur trouvé</div>
                  ) : (
                    availableUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { setExtraMembers((prev) => [...prev, u]); setUserSearch(''); setShowUserDropdown(false); }}
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
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  );
}
