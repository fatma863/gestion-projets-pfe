import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard } from '../../components/ui/MetricCard';
import { Avatar, AvatarGroup } from '../../components/ui/Avatar';
import {
  Plus, Search, Users, Pencil, Trash2, UsersRound, Eye,
} from 'lucide-react';

export default function AdminTeamsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teams', { search }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('per_page', '100');
      return api.get(`/teams?${params}`).then((r) => r.data.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const teams = data || [];
  const totalMembers = teams.reduce((s, t) => s + (t.members_count || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Toutes les équipes"
        description="Administration globale de toutes les équipes"
        actions={
          <Button onClick={() => { setEditingTeam(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle équipe
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard icon={UsersRound} label="Total équipes" value={teams.length} color="bg-blue-50 text-blue-600" />
        <MetricCard icon={Users} label="Total membres" value={totalMembers} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Rechercher une équipe..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : teams.length === 0 ? (
        <Card><CardContent className="py-16 text-center"><Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">Aucune équipe</p></CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Équipe</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-left font-medium">Membres</th>
                  <th className="px-4 py-3 text-left font-medium">Projets</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link to={`/admin/teams/${team.id}`} className="font-medium text-foreground hover:text-primary">{team.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{team.description || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {team.members?.length > 0 && <AvatarGroup users={team.members} max={3} size="xs" />}
                        <Badge variant="secondary">{team.members_count || 0}</Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{team.projects_count || 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/teams/${team.id}`} className="rounded p-1 hover:bg-accent" title="Voir"><Eye size={16} className="text-muted-foreground" /></Link>
                        <button onClick={() => { setEditingTeam(team); setShowForm(true); }} className="rounded p-1 hover:bg-accent"><Pencil size={16} className="text-muted-foreground" /></button>
                        <button onClick={() => { if (window.confirm('Supprimer cette équipe ?')) deleteMutation.mutate(team.id); }} className="rounded p-1 hover:bg-destructive/10"><Trash2 size={16} className="text-destructive" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <TeamFormModal open={showForm} onClose={() => { setShowForm(false); setEditingTeam(null); }} team={editingTeam} />
    </div>
  );
}

function TeamFormModal({ open, onClose, team }) {
  const queryClient = useQueryClient();
  const isEdit = !!team;
  const [form, setForm] = useState({ name: '', description: '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(team ? { name: team.name || '', description: team.description || '' } : { name: '', description: '' });
      setErrors({});
    }
  }, [open, team]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/teams/${team.id}`, data) : api.post('/teams', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); onClose(); },
    onError: (err) => { if (err.response?.status === 422) setErrors(err.response.data.errors || {}); },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Modifier l\'équipe' : 'Nouvelle équipe'}>
      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Nom *</label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name[0]}</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}</Button>
        </div>
      </form>
    </Modal>
  );
}
