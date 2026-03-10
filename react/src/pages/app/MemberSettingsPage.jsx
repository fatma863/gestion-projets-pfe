import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { AvatarUpload } from '../../components/ui/AvatarUpload';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { User, Mail, Shield, Clock, Calendar, Lock, Check, FolderKanban, ListTodo } from 'lucide-react';

export default function MemberSettingsPage() {
  const { user, fetchUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState({});

  const { data: projects } = useQuery({ queryKey: ['my-projects-settings'], queryFn: () => api.get('/projects?per_page=100').then((r) => r.data.data).catch(() => []) });
  const { data: tasks } = useQuery({ queryKey: ['my-tasks-settings'], queryFn: () => api.get('/tasks').then((r) => r.data.tasks).catch(() => []) });
  const [pwSuccess, setPwSuccess] = useState('');

  const profileMutation = useMutation({
    mutationFn: (data) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('email', data.email);
      return api.post('/me/profile', formData);
    },
    onSuccess: () => {
      setProfileErrors({});
      setProfileSuccess('Profil mis à jour avec succès.');
      fetchUser();
      setTimeout(() => setProfileSuccess(''), 3000);
    },
    onError: (err) => {
      setProfileSuccess('');
      if (err.response?.status === 422) setProfileErrors(err.response.data.errors || {});
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data) => api.post('/me/password', data),
    onSuccess: () => {
      setPwErrors({});
      setPwSuccess('Mot de passe modifié avec succès.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwSuccess(''), 3000);
    },
    onError: (err) => {
      setPwSuccess('');
      if (err.response?.status === 422) setPwErrors(err.response.data.errors || {});
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Paramètres" description="Votre profil et informations du compte" />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Profil</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <AvatarUpload />
            <form onSubmit={(e) => { e.preventDefault(); profileMutation.mutate({ name, email }); }} className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Nom</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
                {profileErrors.name && <p className="mt-1 text-xs text-destructive">{profileErrors.name[0]}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {profileErrors.email && <p className="mt-1 text-xs text-destructive">{profileErrors.email[0]}</p>}
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="w-28 text-sm text-muted-foreground">Fuseau horaire</span>
                <span className="text-sm font-medium text-foreground">{user?.timezone || 'Africa/Tunis'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="w-28 text-sm text-muted-foreground">Inscrit le</span>
                <span className="text-sm font-medium text-foreground">{user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}</span>
              </div>
              {profileSuccess && <p className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> {profileSuccess}</p>}
              <Button type="submit" disabled={profileMutation.isPending} size="sm">
                {profileMutation.isPending ? 'Enregistrement...' : 'Mettre à jour le profil'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5" /> Changer le mot de passe</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); passwordMutation.mutate({ current_password: currentPassword, password: newPassword, password_confirmation: confirmPassword }); }} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Mot de passe actuel</label>
                  <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                  {pwErrors.current_password && <p className="mt-1 text-xs text-destructive">{pwErrors.current_password[0]}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Nouveau mot de passe</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  {pwErrors.password && <p className="mt-1 text-xs text-destructive">{pwErrors.password[0]}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Confirmer le mot de passe</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                {pwSuccess && <p className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> {pwSuccess}</p>}
                <Button type="submit" disabled={passwordMutation.isPending} size="sm">
                  {passwordMutation.isPending ? 'Modification...' : 'Changer le mot de passe'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Rôles & Permissions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Rôles</p>
                <div className="flex flex-wrap gap-2">
                  {(user?.roles || []).map((role) => <Badge key={typeof role === 'string' ? role : role.name} variant="default"><Shield className="mr-1 h-3 w-3" />{typeof role === 'string' ? role : role.name}</Badge>)}
                  {(!user?.roles || user.roles.length === 0) && <span className="text-sm text-muted-foreground">Aucun rôle</span>}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {(user?.permissions || []).map((perm) => <Badge key={typeof perm === 'string' ? perm : perm.name} variant="outline" className="text-xs">{typeof perm === 'string' ? perm : perm.name}</Badge>)}
                  {(!user?.permissions || user.permissions.length === 0) && <span className="text-sm text-muted-foreground">Aucune permission directe</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assigned Projects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FolderKanban className="h-5 w-5" /> Projets assignés
            {projects?.length > 0 && <Badge variant="secondary" className="ml-auto">{projects.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!projects?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucun projet assigné</p>
          ) : (
            <div className="space-y-2">
              {projects.slice(0, 10).map((p) => (
                <Link key={p.id} to={`/app/projects/${p.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-mono font-semibold text-primary">{p.code}</span>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                  <ProgressBar value={p.progress_percent || 0} size="sm" className="w-20" />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assigned Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListTodo className="h-5 w-5" /> Tâches assignées
            {tasks?.length > 0 && <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!tasks?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Aucune tâche assignée</p>
          ) : (
            <div className="space-y-2">
              {tasks.slice(0, 10).map((t) => {
                const isDone = ['done', 'terminé'].includes(t.status?.name?.toLowerCase());
                return (
                  <div key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${isDone ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{t.title}</p>
                      <p className="text-xs text-muted-foreground">{t.project?.name || ''}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {t.status && <Badge variant="secondary" className="text-[10px]">{t.status.name}</Badge>}
                      {t.due_date && <span className="text-[11px] text-muted-foreground">{new Date(t.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                  </div>
                );
              })}
              {tasks.length > 10 && (
                <Link to="/app/my-tasks" className="block text-center text-sm text-primary hover:underline mt-2">Voir toutes les tâches ({tasks.length})</Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
