import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Users, Plus, Pencil, Trash2, Shield, X } from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () =>
      api.get('/admin/users', { params: { search: search || undefined, role: roleFilter || undefined, per_page: 50 } })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => api.post(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.users || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground">{data?.meta?.total ?? 0} utilisateur(s)</p>
        </div>
        <Button onClick={() => { setEditUser(null); setShowModal(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nouvel utilisateur
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-40">
          <option value="">Tous les rôles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Membre</option>
          <option value="viewer">Viewer</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Nom</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Rôle</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleName = (u.roles || []).map((r) => (typeof r === 'string' ? r : r.name)).join(', ') || 'Aucun';
                  return (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={roleName.split(', ')[0]}
                          onChange={(e) => changeRoleMutation.mutate({ userId: u.id, role: e.target.value })}
                          className="w-32 h-8 text-xs"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="member">Membre</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditUser(u); setShowModal(true); }}
                            className="rounded p-1 hover:bg-accent"
                            title="Modifier"
                          >
                            <Pencil size={16} className="text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Supprimer l'utilisateur ${u.name} ?`)) {
                                deleteMutation.mutate(u.id);
                              }
                            }}
                            className="rounded p-1 hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 size={16} className="text-destructive" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Aucun utilisateur trouvé</td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
          }}
        />
      )}
    </div>
  );
}

function UserModal({ user, onClose, onSuccess }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(
    user ? ((user.roles || []).map((r) => (typeof r === 'string' ? r : r.name))[0] || 'member') : 'member'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (user) {
        const payload = { name, email };
        if (password) payload.password = password;
        await api.put(`/admin/users/${user.id}`, payload);
      } else {
        await api.post('/admin/users', { name, email, password, role });
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{user ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent"><X size={20} /></button>
        </div>
        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Mot de passe {user && <span className="text-muted-foreground">(laisser vide pour ne pas changer)</span>}
            </label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} {...(!user && { required: true, minLength: 8 })} />
          </div>
          {!user && (
            <div>
              <label className="mb-1 block text-sm font-medium">Rôle</label>
              <Select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Membre</option>
                <option value="viewer">Viewer</option>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner className="mr-2" /> : null}
              {user ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
