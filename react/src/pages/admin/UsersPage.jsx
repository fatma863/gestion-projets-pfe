import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Spinner } from '../../components/ui/Spinner';
import { Avatar } from '../../components/ui/Avatar';
import { Users, Plus, Pencil, Trash2, Shield, X, Camera, Loader2 } from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser, fetchUser } = useAuth();
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
          <option value="viewer">Observateur</option>
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
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} src={u.avatar} size="md" />
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
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
                          <option value="viewer">Observateur</option>
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
          currentUserId={currentUser?.id}
          fetchCurrentUser={fetchUser}
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

function UserModal({ user, currentUserId, fetchCurrentUser, onClose, onSuccess }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(
    user ? ((user.roles || []).map((r) => (typeof r === 'string' ? r : r.name))[0] || 'member') : 'member'
  );
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const avatarInputRef = useState(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (user) {
        if (avatarFile) {
          const formData = new FormData();
          formData.append('name', name);
          formData.append('email', email);
          if (password) formData.append('password', password);
          formData.append('avatar', avatarFile);
          await api.post(`/admin/users/${user.id}?_method=PUT`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          const payload = { name, email };
          if (password) payload.password = password;
          await api.put(`/admin/users/${user.id}`, payload);
        }
        if (user.id === currentUserId) {
          await fetchCurrentUser();
        }
      } else {
        if (avatarFile) {
          const formData = new FormData();
          formData.append('name', name);
          formData.append('email', email);
          formData.append('password', password);
          formData.append('role', role);
          formData.append('avatar', avatarFile);
          await api.post('/admin/users', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } else {
          await api.post('/admin/users', { name, email, password, role });
        }
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
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              {(avatarPreview || user?.avatar) ? (
                <img
                  src={avatarPreview || user.avatar}
                  alt={name}
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
                />
              ) : (
                <Avatar name={name || '?'} size="xl" className="ring-2 ring-primary/20" />
              )}
              <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-4 w-4 text-white" />
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG ou WebP. Max 2 Mo.</p>
          </div>
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
                <option value="viewer">Observateur</option>
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
