import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { AvatarUpload } from '../../components/ui/AvatarUpload';
import { User, Mail, Shield, Clock, Calendar, Lock, Check } from 'lucide-react';

export default function AdminSettingsPage() {
  const { user, fetchUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileErrors, setProfileErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwErrors, setPwErrors] = useState({});
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres système</h1>
        <p className="text-muted-foreground">Configuration générale et profil administrateur</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Mon profil</CardTitle>
          </CardHeader>
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
                <InfoRow icon={Clock} label="Fuseau horaire" value={user?.timezone || 'Africa/Tunis'} />
              </div>
              <div className="flex items-center gap-3">
                <InfoRow icon={Calendar} label="Inscrit le" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'} />
              </div>
              {profileSuccess && <p className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> {profileSuccess}</p>}
              <Button type="submit" disabled={profileMutation.isPending} size="sm">
                {profileMutation.isPending ? 'Enregistrement...' : 'Mettre à jour le profil'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Password card */}
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

          {/* Roles & Permissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rôles & Permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium">Rôles</p>
                <div className="flex flex-wrap gap-2">
                  {(user?.roles || []).map((role) => (
                    <Badge key={typeof role === 'string' ? role : role.name} variant="default">
                      <Shield className="mr-1 h-3 w-3" />
                      {typeof role === 'string' ? role : role.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Permissions</p>
                <div className="flex flex-wrap gap-2">
                  {(user?.permissions || []).map((perm) => (
                    <Badge key={typeof perm === 'string' ? perm : perm.name} variant="outline" className="text-xs">
                      {typeof perm === 'string' ? perm : perm.name}
                    </Badge>
                  ))}
                  {(!user?.permissions || user.permissions.length === 0) && (
                    <span className="text-sm text-muted-foreground">Aucune permission directe</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="w-28 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '-'}</span>
    </>
  );
}
