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
import {
  Plus, Search, Users, MoreVertical, Pencil, Trash2, Eye,
} from 'lucide-react';

const EMPTY_FORM = { name: '', description: '' };

export default function ManagerTeamsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['teams', { search }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('per_page', '50');
      return api.get(`/teams?${params}`).then((r) => r.data.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Équipes"
        description="Gérez vos équipes de travail"
        actions={
          <Button onClick={() => { setEditingTeam(null); setShowForm(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle équipe
          </Button>
        }
      />

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
            <Card key={team.id} className="group relative transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="absolute right-3 top-3">
                  <button onClick={() => setMenuOpen(menuOpen === team.id ? null : team.id)} className="rounded-md p-1 opacity-0 hover:bg-accent group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {menuOpen === team.id && (
                    <div className="absolute right-0 top-8 z-10 w-40 rounded-md border border-border bg-white py-1 shadow-lg">
                      <Link to={`/manager/teams/${team.id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Eye className="h-4 w-4" /> Voir</Link>
                      <button onClick={() => { setEditingTeam(team); setShowForm(true); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"><Pencil className="h-4 w-4" /> Modifier</button>
                      <button onClick={() => { if (window.confirm('Supprimer cette équipe ?')) deleteMutation.mutate(team.id); setMenuOpen(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /> Supprimer</button>
                    </div>
                  )}
                </div>
                <Link to={`/manager/teams/${team.id}`} className="block">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg font-bold text-primary">{team.name[0]}</div>
                  <h3 className="mb-1 font-semibold text-foreground">{team.name}</h3>
                  {team.description && <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{team.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {team.members_count || 0} membres</span>
                    <span>{team.projects_count || 0} projets</span>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TeamFormModal open={showForm} onClose={() => { setShowForm(false); setEditingTeam(null); }} team={editingTeam} />
    </div>
  );
}

function TeamFormModal({ open, onClose, team }) {
  const queryClient = useQueryClient();
  const isEdit = !!team;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(team ? { name: team.name || '', description: team.description || '' } : { ...EMPTY_FORM });
      setErrors({});
    }
  }, [open, team]);

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? api.put(`/teams/${team.id}`, data) : api.post('/teams', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); onClose(); },
    onError: (err) => { if (err.response?.status === 422) setErrors(err.response.data.errors || {}); },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Modifier l'équipe" : 'Nouvelle équipe'}>
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
